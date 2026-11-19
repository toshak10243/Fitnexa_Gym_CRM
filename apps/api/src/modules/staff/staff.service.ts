import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import {
  PaginatedResult,
  StaffResponse,
  UserRole,
  UserStatus,
} from '@fitnexa/shared';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findStaffByTenant(
    tenantId: string,
    page = 1,
    limit = 20,
    search?: string,
    role?: UserRole,
    status?: UserStatus,
  ): Promise<PaginatedResult<StaffResponse>> {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (role) where.role = role;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const items: StaffResponse[] = users.map((u) => ({
      id: u.id,
      tenantId: u.tenantId!,
      branchId: u.branchId,
      branchName: u.branch?.name || null,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role as UserRole,
      status: u.status as UserStatus,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createStaff(
    tenantId: string,
    createdById: string,
    dto: CreateStaffDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<StaffResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Selected branch does not belong to your gym organization');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        status: 'ACTIVE',
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: createdById,
      action: 'STAFF_CREATED',
      resource: 'User',
      resourceId: user.id,
      details: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: user.id,
      tenantId: user.tenantId!,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getStaffById(tenantId: string, staffId: string): Promise<StaffResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found or belongs to another tenant');
    }

    return {
      id: user.id,
      tenantId: user.tenantId!,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateStaff(
    tenantId: string,
    staffId: string,
    updatedById: string,
    dto: UpdateStaffDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<StaffResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found or belongs to another tenant');
    }

    // Protect Gym Owner role mutation by non-owners
    if (user.role === UserRole.GYM_OWNER && dto.role && dto.role !== UserRole.GYM_OWNER) {
      throw new BadRequestException('Gym Owner role cannot be demoted');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Selected branch does not belong to your gym organization');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: dto,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: updatedById,
      action: 'STAFF_UPDATED',
      resource: 'User',
      resourceId: staffId,
      details: dto,
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId!,
      branchId: updated.branchId,
      branchName: updated.branch?.name || null,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role as UserRole,
      status: updated.status as UserStatus,
      lastLoginAt: updated.lastLoginAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updateStaffStatus(
    tenantId: string,
    staffId: string,
    updatedById: string,
    status: UserStatus,
    ipAddress: string,
    userAgent: string,
  ): Promise<StaffResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found');
    }

    if (user.role === UserRole.GYM_OWNER) {
      throw new BadRequestException('Primary Gym Owner account status cannot be modified');
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: { status },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: updatedById,
      action: `STAFF_STATUS_${status}`,
      resource: 'User',
      resourceId: staffId,
      details: { newStatus: status, email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId!,
      branchId: updated.branchId,
      branchName: updated.branch?.name || null,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role as UserRole,
      status: updated.status as UserStatus,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
