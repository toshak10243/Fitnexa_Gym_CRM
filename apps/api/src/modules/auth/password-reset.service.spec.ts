import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
jest.mock('../mail/mail.service', () => ({ MailService: class {} }));

describe('Password recovery', () => {
  const client = { set: jest.fn(), eval: jest.fn(), del: jest.fn() };
  const prisma = { user: { findFirst: jest.fn() }, $transaction: jest.fn() };
  const redis = { getClient: () => client, isReady: jest.fn() };
  const mail = { sendPasswordResetOtp: jest.fn() };
  const service = new PasswordResetService(prisma as unknown as PrismaService, redis as unknown as RedisService, mail as unknown as MailService);
  beforeEach(() => { jest.resetAllMocks(); redis.isReady.mockReturnValue(true); client.set.mockResolvedValue('OK'); });
  it('requires Redis availability instead of bypassing security', async () => {
    redis.isReady.mockReturnValue(false);
    await expect(service.request({ accountType: 'SUPER_ADMIN', email: 'a@example.com' })).rejects.toThrow('temporarily unavailable');
  });
  it('scopes gym recovery to both subdomain and non-platform role', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await service.request({ accountType: 'TENANT', email: 'a@example.com', subdomain: 'gym' });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { email: 'a@example.com', status: 'ACTIVE', role: { not: 'SUPER_ADMIN' }, tenant: { slug: 'gym' } } });
    expect(mail.sendPasswordResetOtp).not.toHaveBeenCalled();
  });
  it('stores a hash rather than the emailed OTP and requires SMTP', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u', passwordHash: 'old' });
    mail.sendPasswordResetOtp.mockResolvedValue({ success: true, mode: 'smtp' });
    await service.request({ accountType: 'SUPER_ADMIN', email: 'a@example.com' });
    const otp = mail.sendPasswordResetOtp.mock.calls[0][1];
    expect(otp).toMatch(/^\d{6}$/);
    expect(client.set.mock.calls[1][1]).not.toContain(otp);
  });
  it('rejects incorrect, expired or consumed challenges', async () => {
    client.eval.mockResolvedValue('');
    await expect(service.verify({ challengeId: 'id', otp: '123456' })).rejects.toThrow('Invalid or expired');
  });
  it('rejects confirmation mismatch before consuming a grant', async () => {
    await expect(service.complete({ resetToken: 'token', newPassword: 'New@12345', confirmPassword: 'other' })).rejects.toThrow('do not match');
    expect(client.eval).not.toHaveBeenCalled();
  });
  it('updates password and writes audit in one transaction', async () => {
    const passwordHash = await bcrypt.hash('Old@12345', 4);
    client.eval.mockResolvedValue(JSON.stringify({ userId: 'u', passwordHash }));
    const tx = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'u', tenantId: 't', status: 'ACTIVE', passwordHash }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, auditLog: { create: jest.fn() } };
    prisma.$transaction.mockImplementation(fn => fn(tx));
    await service.complete({ resetToken: 'token', newPassword: 'New@12345', confirmPassword: 'New@12345' });
    const data = tx.user.updateMany.mock.calls[0][0].data;
    expect(await bcrypt.compare('New@12345', data.passwordHash)).toBe(true);
    expect(data.refreshTokenHash).toBeNull();
    expect(data.mustChangePassword).toBe(false);
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
