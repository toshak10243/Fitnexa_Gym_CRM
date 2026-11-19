import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AuthTokensResponse,
  AuthUserResponse,
  UserRole,
  UserStatus,
} from '@fitnexa/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${baseSlug}-${randomSuffix}`;
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    branchId?: string | null;
  }): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
    };

    const accessTokenExpiresIn = 60 * 15; // 15 minutes
    const refreshTokenExpiresIn = 60 * 60 * 24 * 7; // 7 days

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'fitnexa-development-refresh-secret-key-32-chars-2026',
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
    };
  }

  async registerOwner(
    dto: RegisterOwnerDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokensResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const tenantSlug = this.generateSlug(dto.gymName);

    // Atomic transaction for Onboarding
    const { tenant, branch, user } = await this.prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.gymName,
            slug: tenantSlug,
            gstin: dto.gstin || null,
            phone: dto.phone,
            email: dto.email.toLowerCase(),
            address: dto.address,
            city: dto.city,
            state: dto.state,
            pincode: dto.pincode,
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            status: 'ACTIVE',
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            name: `${dto.gymName} - Main Facility`,
            code: 'MAIN-01',
            address: dto.address,
            city: dto.city,
            state: dto.state,
            pincode: dto.pincode,
            phone: dto.phone,
            isMainBranch: true,
            status: 'ACTIVE',
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            email: dto.email.toLowerCase(),
            passwordHash,
            fullName: dto.ownerName,
            phone: dto.phone,
            role: 'GYM_OWNER',
            status: 'ACTIVE',
          },
        });

        return { tenant, branch, user };
      },
    );

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      branchId: branch.id,
    });

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    await this.auditLogService.record({
      tenantId: tenant.id,
      userId: user.id,
      action: 'TENANT_ONBOARDED',
      resource: 'Tenant',
      resourceId: tenant.id,
      details: {
        gymName: tenant.name,
        branchName: branch.name,
        ownerEmail: user.email,
      },
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        tenantId: tenant.id,
        branchId: branch.id,
        lastLoginAt: new Date().toISOString(),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        currency: tenant.currency,
        timezone: tenant.timezone,
        gstin: tenant.gstin,
        city: tenant.city,
        state: tenant.state,
      },
    };
  }

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `Your account is currently ${user.status.toLowerCase()}. Contact your gym administrator.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.tenant) {
      throw new UnauthorizedException('User account is not linked to an active gym tenant');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant.id,
      branchId: user.branchId,
    });

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const loginTime = new Date();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: loginTime },
    });

    await this.auditLogService.record({
      tenantId: user.tenant.id,
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'Auth',
      resourceId: user.id,
      details: { role: user.role, email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        tenantId: user.tenant.id,
        branchId: user.branchId,
        lastLoginAt: loginTime.toISOString(),
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        currency: user.tenant.currency,
        timezone: user.tenant.timezone,
        gstin: user.tenant.gstin,
        city: user.tenant.city,
        state: user.tenant.state,
      },
    };
  }

  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'fitnexa-development-refresh-secret-key-32-chars-2026',
      });
    } catch {
      throw new UnauthorizedException('Refresh token is expired or invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid session');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      // Possible token theft, invalidate stored hash immediately
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newTokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId!,
      branchId: user.branchId,
    });

    const newHash = await bcrypt.hash(newTokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newHash },
    });

    await this.auditLogService.record({
      tenantId: user.tenantId!,
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      resource: 'Auth',
      ipAddress,
      userAgent,
    });

    return newTokens;
  }

  async logout(
    userId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'USER_LOGOUT',
      resource: 'Auth',
      ipAddress,
      userAgent,
    });
  }

  async getMe(userId: string): Promise<{ user: AuthUserResponse; tenant: any }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          include: {
            branches: {
              where: { status: 'ACTIVE' },
              select: { id: true, name: true, code: true, isMainBranch: true },
            },
          },
        },
        branch: true,
      },
    });

    if (!user || !user.tenant) {
      throw new NotFoundException('User profile not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        tenantId: user.tenant.id,
        branchId: user.branchId,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        gstin: user.tenant.gstin,
        pan: user.tenant.pan,
        phone: user.tenant.phone,
        email: user.tenant.email,
        address: user.tenant.address,
        city: user.tenant.city,
        state: user.tenant.state,
        pincode: user.tenant.pincode,
        currency: user.tenant.currency,
        timezone: user.tenant.timezone,
        status: user.tenant.status,
        branches: user.tenant.branches,
      },
    };
  }

  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be identical to current password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null, // Force re-login on other devices
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: userId,
      ipAddress,
      userAgent,
    });
  }
}
