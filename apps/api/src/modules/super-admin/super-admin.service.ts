import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import {
  CreateTenantClientDto,
  UpdateTenantSubscriptionDto,
} from './dto/create-tenant-client.dto';
import {
  SAAS_PLANS,
  SaaSModule,
  SaaSSubscriptionPlan,
  UserRole,
} from '@fitnexa/shared';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
  ) {}

  async getDashboardStats() {
    const [totalTenants, activeTenants, tenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          subscriptionPlan: true,
          subscriptionPrice: true,
          subscriptionStatus: true,
          paymentStatus: true,
          planExpiresAt: true,
          isLifetime: true,
          createdAt: true,
        },
      }),
    ]);

    const trialCount = tenants.filter(
      (t) => t.subscriptionPlan === SaaSSubscriptionPlan.TRIAL_7_DAYS,
    ).length;

    const now = new Date();
    const expiredCount = tenants.filter(
      (t) => !t.isLifetime && t.planExpiresAt && new Date(t.planExpiresAt) < now,
    ).length;

    const totalRevenue = tenants
      .filter((t) => t.paymentStatus === 'PAID')
      .reduce((sum, t) => sum + (t.subscriptionPrice || 0), 0);

    return {
      totalTenants,
      activeTenants,
      trialCount,
      expiredCount,
      totalRevenue,
      plansSummary: {
        trial: trialCount,
        monthly: tenants.filter((t) => t.subscriptionPlan === SaaSSubscriptionPlan.MONTH_1).length,
        quarterly: tenants.filter((t) => t.subscriptionPlan === SaaSSubscriptionPlan.MONTH_3).length,
        semiAnnual: tenants.filter((t) => t.subscriptionPlan === SaaSSubscriptionPlan.MONTH_6).length,
        annual: tenants.filter((t) => t.subscriptionPlan === SaaSSubscriptionPlan.MONTH_12).length,
        lifetime: tenants.filter((t) => t.subscriptionPlan === SaaSSubscriptionPlan.LIFETIME).length,
      },
    };
  }

  async getAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: UserRole.GYM_OWNER },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            lastLoginAt: true,
            mustChangePassword: true,
          },
          take: 1,
        },
        _count: {
          select: {
            members: true,
            branches: true,
            users: true,
          },
        },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl,
      website: t.website,
      instagram: t.instagram,
      whatsapp: t.whatsapp,
      phone: t.phone,
      email: t.email,
      address: t.address,
      city: t.city,
      state: t.state,
      pincode: t.pincode,
      status: t.status,
      subscriptionPlan: t.subscriptionPlan,
      subscriptionPrice: t.subscriptionPrice,
      subscriptionStatus: t.subscriptionStatus,
      planStartedAt: t.planStartedAt,
      planExpiresAt: t.planExpiresAt,
      isLifetime: t.isLifetime,
      paymentStatus: t.paymentStatus,
      paymentMode: t.paymentMode,
      paymentReference: t.paymentReference,
      enabledModules: t.enabledModules,
      createdAt: t.createdAt,
      owner: t.users[0] || null,
      stats: {
        totalMembers: t._count.members,
        totalBranches: t._count.branches,
        totalUsers: t._count.users,
      },
    }));
  }

  async createTenantClient(dto: CreateTenantClientDto, adminUserId: string) {
    const cleanSlug = dto.slug.toLowerCase().trim();
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingSlug) {
      throw new ConflictException(`Company slug "${cleanSlug}" is already taken.`);
    }

    const cleanEmail = dto.ownerEmail.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw new ConflictException(`An account with email "${cleanEmail}" already exists.`);
    }

    const planConfig = SAAS_PLANS[dto.plan] || SAAS_PLANS[SaaSSubscriptionPlan.TRIAL_7_DAYS];
    const planExpiresAt = planConfig.isLifetime
      ? null
      : new Date(Date.now() + planConfig.durationDays * 24 * 60 * 60 * 1000);

    const tempPassword = `Fitnexa@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const defaultModules = Object.values(SaaSModule);
    const assignedModules =
      dto.enabledModules && dto.enabledModules.length > 0 ? dto.enabledModules : defaultModules;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name.trim(),
          slug: cleanSlug,
          phone: dto.ownerPhone.trim(),
          email: cleanEmail,
          address: dto.address?.trim() || 'Flagship Gym Location',
          city: dto.city?.trim() || 'Mumbai',
          state: dto.state?.trim() || 'Maharashtra',
          pincode: dto.pincode?.trim() || '400001',
          subscriptionPlan: dto.plan,
          subscriptionPrice: planConfig.price,
          subscriptionStatus: 'ACTIVE',
          planStartedAt: new Date(),
          planExpiresAt,
          isLifetime: planConfig.isLifetime,
          paymentStatus: dto.paymentStatus || (planConfig.price === 0 ? 'TRIAL' : 'PAID'),
          paymentMode: dto.paymentMode || (planConfig.price === 0 ? 'FREE_TRIAL' : 'ONLINE'),
          paymentReference: dto.paymentReference?.trim() || null,
          enabledModules: assignedModules,
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${tenant.name} - Main Facility`,
          code: 'MAIN-01',
          address: tenant.address,
          city: tenant.city,
          state: tenant.state,
          pincode: tenant.pincode,
          phone: tenant.phone,
          isMainBranch: true,
          status: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          email: cleanEmail,
          passwordHash,
          fullName: dto.ownerName.trim(),
          phone: dto.ownerPhone.trim(),
          role: UserRole.GYM_OWNER,
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });

      return { tenant, branch, user };
    });

    await this.auditLogService.record({
      tenantId: result.tenant.id,
      userId: adminUserId,
      action: 'SAAS_CLIENT_CREATED',
      resource: 'Tenant',
      resourceId: result.tenant.id,
      details: {
        gymName: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.subscriptionPlan,
        price: result.tenant.subscriptionPrice,
        ownerEmail: cleanEmail,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Fitnexa-SaaS-Engine',
    });

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    let mailSent = false;
    let mailMode = 'dev_log';
    try {
      const mailRes = await this.mailService.sendWelcomeClientEmail({
        to: cleanEmail,
        clientName: result.tenant.name,
        adminName: result.user.fullName,
        tempPassword,
        planName: planConfig.name,
        loginUrl: `${appUrl}/login`,
        expiresAt: result.tenant.planExpiresAt,
        isLifetime: result.tenant.isLifetime,
      });
      mailSent = mailRes.success;
      mailMode = mailRes.mode;
    } catch (err: any) {
      // Don't fail client creation if mail fails
    }

    return {
      success: true,
      tenant: result.tenant,
      owner: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      temporaryPassword: tempPassword,
      subdomainUrl: `http://${cleanSlug}.localhost:5173`,
      mailDispatched: mailSent,
      mailDeliveryMode: mailMode,
    };
  }

  async updateTenantSubscription(
    tenantId: string,
    dto: UpdateTenantSubscriptionDto,
    adminUserId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Client tenant not found');

    const updateData: any = {};
    if (dto.plan) {
      const planConfig = SAAS_PLANS[dto.plan];
      if (planConfig) {
        updateData.subscriptionPlan = dto.plan;
        updateData.subscriptionPrice = dto.price ?? planConfig.price;
        updateData.isLifetime = planConfig.isLifetime;
        if (planConfig.isLifetime) {
          updateData.planExpiresAt = null;
        } else {
          updateData.planExpiresAt = new Date(
            Date.now() + planConfig.durationDays * 24 * 60 * 60 * 1000,
          );
        }
      }
    }

    if (dto.price !== undefined) updateData.subscriptionPrice = dto.price;
    if (dto.paymentStatus) updateData.paymentStatus = dto.paymentStatus;
    if (dto.paymentReference) updateData.paymentReference = dto.paymentReference;
    if (dto.status) updateData.status = dto.status;
    if (dto.planExpiresAt) updateData.planExpiresAt = new Date(dto.planExpiresAt);
    if (dto.enabledModules) updateData.enabledModules = dto.enabledModules;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    await this.auditLogService.record({
      tenantId,
      userId: adminUserId,
      action: 'SAAS_CLIENT_SUBSCRIPTION_UPDATED',
      resource: 'Tenant',
      resourceId: tenantId,
      details: updateData,
      ipAddress: '127.0.0.1',
      userAgent: 'Fitnexa-SaaS-Engine',
    });

    return updated;
  }

  async resetClientPassword(tenantId: string, adminUserId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.GYM_OWNER },
    });
    if (!owner) throw new NotFoundException('Gym owner account not found for this tenant.');

    const tempPassword = `Fitnexa@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id: owner.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: adminUserId,
      action: 'SAAS_CLIENT_PASSWORD_RESET',
      resource: 'User',
      resourceId: owner.id,
      details: { ownerEmail: owner.email },
      ipAddress: '127.0.0.1',
      userAgent: 'Fitnexa-SaaS-Engine',
    });

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    let mailSent = false;
    let mailMode = 'dev_log';
    try {
      const mailRes = await this.mailService.sendPasswordResetEmail({
        to: owner.email,
        adminName: owner.fullName,
        newPassword: tempPassword,
        loginUrl: `${appUrl}/login`,
      });
      mailSent = mailRes.success;
      mailMode = mailRes.mode;
    } catch (e: any) {
      // Don't fail reset if mail throws
    }

    return {
      success: true,
      email: owner.email,
      temporaryPassword: tempPassword,
      mailDispatched: mailSent,
      mailDeliveryMode: mailMode,
    };
  }

  async sendSubscriptionReminder(tenantId: string, adminUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: UserRole.GYM_OWNER },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Client tenant not found');
    const owner = tenant.users[0];
    if (!owner) throw new BadRequestException('No gym owner user found for this tenant');

    if (tenant.isLifetime || !tenant.planExpiresAt) {
      throw new BadRequestException('Cannot send renewal reminder for lifetime subscriptions without expiry');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    const planConfig = SAAS_PLANS[tenant.subscriptionPlan as SaaSSubscriptionPlan] || {
      name: tenant.subscriptionPlan,
    };

    const mailRes = await this.mailService.sendPlanExpiryReminderEmail({
      to: owner.email,
      clientName: tenant.name,
      adminName: owner.fullName,
      planName: planConfig.name,
      expiresAt: tenant.planExpiresAt,
      renewalUrl: `${appUrl}/settings`,
    });

    await this.auditLogService.record({
      tenantId,
      userId: adminUserId,
      action: 'SAAS_CLIENT_RENEWAL_REMINDER_SENT',
      resource: 'Tenant',
      resourceId: tenantId,
      details: {
        ownerEmail: owner.email,
        expiresAt: tenant.planExpiresAt,
        deliveryMode: mailRes.mode,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Fitnexa-SaaS-Engine',
    });

    return {
      success: true,
      message: `Reminder email successfully dispatched to ${owner.email}`,
      deliveryMode: mailRes.mode,
    };
  }

  async impersonateTenant(tenantId: string, adminUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: UserRole.GYM_OWNER },
          take: 1,
        },
        branches: {
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const owner = tenant.users[0];
    if (!owner) throw new BadRequestException('No gym owner user found to impersonate');

    const branch = tenant.branches[0];

    const payload = {
      sub: owner.id,
      email: owner.email,
      role: owner.role,
      tenantId: tenant.id,
      branchId: branch?.id || null,
      impersonatedBy: adminUserId,
    };

    const accessTokenExpiresIn = 60 * 60; // 1 hour for impersonation session
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: accessTokenExpiresIn,
    });

    return {
      accessToken,
      user: {
        id: owner.id,
        email: owner.email,
        fullName: owner.fullName,
        phone: owner.phone,
        role: owner.role,
        tenantId: tenant.id,
        branchId: branch?.id || null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        enabledModules: tenant.enabledModules,
        logoUrl: tenant.logoUrl,
        subscriptionPlan: tenant.subscriptionPlan,
      },
    };
  }
}
