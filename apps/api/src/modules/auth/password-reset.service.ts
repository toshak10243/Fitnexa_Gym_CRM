import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import type { CompleteResetDto, RequestResetDto, VerifyResetDto } from './password-reset.controller';

interface Grant { userId: string; passwordHash: string; otpHash?: string }
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
// Attempts and consumption are atomic across all API workers.
export const VERIFY_OTP_SCRIPT = `local v=redis.call('GET',KEYS[1]); if not v then return '' end
local d=cjson.decode(v); if d.otpHash~=ARGV[1] then
local n=redis.call('INCR',KEYS[2]); if n==1 then redis.call('EXPIRE',KEYS[2],600) end
if n>=5 then redis.call('DEL',KEYS[1]) end; return '' end
redis.call('DEL',KEYS[1],KEYS[2]); return v`;
@Injectable()
export class PasswordResetService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService, private readonly mail: MailService) {}
  private client() {
    const c = this.redis.getClient();
    if (!c || !this.redis.isReady()) throw new ServiceUnavailableException('Password recovery is temporarily unavailable. Please try again.');
    return c;
  }
  async request(dto: RequestResetDto) {
    const c = this.client();
    const email = dto.email.trim().toLowerCase();
    const challengeId = randomUUID();
    const response = { challengeId, message: 'If these account details match, a verification code has been sent. It expires in 10 minutes.' };
    const cooldown = await c.set(`reset:cooldown:${digest(email)}`, '1', 'EX', 60, 'NX');
    if (!cooldown) return response;
    const user = await this.prisma.user.findFirst({ where: {
      email, status: 'ACTIVE',
      ...(dto.accountType === 'SUPER_ADMIN' ? { role: 'SUPER_ADMIN' as const } : { role: { not: 'SUPER_ADMIN' as const }, tenant: { slug: dto.subdomain } }),
    } });
    if (!user) return response;
    const otp = String(randomInt(100000, 1000000));
    const key = `reset:challenge:${challengeId}`;
    await c.set(key, JSON.stringify({ userId: user.id, passwordHash: user.passwordHash, otpHash: digest(challengeId + otp) }), 'EX', 600);
    const sent = await this.mail.sendPasswordResetOtp(email, otp);
    if (!sent.success || sent.mode !== 'smtp') {
      await c.del(key);
      throw new ServiceUnavailableException('Unable to send the verification email. Please try again shortly.');
    }
    return response;
  }
  async verify(dto: VerifyResetDto) {
    const c = this.client();
    const key = `reset:challenge:${dto.challengeId}`;
    const raw = await c.eval(VERIFY_OTP_SCRIPT, 2, key, `${key}:attempts`, digest(dto.challengeId + dto.otp));
    if (typeof raw !== 'string' || !raw) throw new BadRequestException('Invalid or expired verification code. Request a new code after five failed attempts.');
    const grant = JSON.parse(raw) as Grant;
    const resetToken = randomBytes(32).toString('hex');
    await c.set(`reset:grant:${digest(resetToken)}`, JSON.stringify({ userId: grant.userId, passwordHash: grant.passwordHash }), 'EX', 300);
    return { resetToken };
  }
  async complete(dto: CompleteResetDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('Passwords do not match.');
    if (Buffer.byteLength(dto.newPassword, 'utf8') > 72) throw new BadRequestException('Password must be at most 72 bytes.');
    const c = this.client();
    const raw = await c.eval("local v=redis.call('GET',KEYS[1]); redis.call('DEL',KEYS[1]); return v", 1, `reset:grant:${digest(dto.resetToken)}`);
    if (typeof raw !== 'string' || !raw) throw new BadRequestException('Reset session expired. Please request another code.');
    const grant = JSON.parse(raw) as Grant;
    if (await bcrypt.compare(dto.newPassword, grant.passwordHash)) throw new BadRequestException('Choose a password different from your current password.');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: grant.userId } });
      if (!user || user.status !== 'ACTIVE' || user.passwordHash !== grant.passwordHash) throw new BadRequestException('Reset session is no longer valid. Request a new code.');
      const updated = await tx.user.updateMany({ where: { id: user.id, passwordHash: grant.passwordHash }, data: { passwordHash, mustChangePassword: false, refreshTokenHash: null } });
      if (updated.count !== 1) throw new BadRequestException('Reset session is no longer valid.');
      if (user.tenantId) await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: 'PASSWORD_RESET', resource: 'User', resourceId: user.id, ipAddress: 'account-recovery', userAgent: 'email-otp' } });
      else await tx.systemHealthRecord.create({ data: { service: 'platform-account-security', status: 'PASSWORD_RESET', metadata: { userId: user.id } } });
    });
    return { message: 'Password changed successfully. Sign in with your new password.' };
  }
}
