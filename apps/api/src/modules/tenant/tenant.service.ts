import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchResponse, BranchStatus, TenantDetailResponse } from '@fitnexa/shared';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(tenantId: string): Promise<TenantDetailResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Gym tenant not found');
    }

    const branches: BranchResponse[] = tenant.branches.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      name: b.name,
      code: b.code,
      address: b.address,
      city: b.city,
      state: b.state,
      pincode: b.pincode,
      phone: b.phone,
      isMainBranch: b.isMainBranch,
      status: b.status as BranchStatus,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      gstin: tenant.gstin,
      pan: tenant.pan,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      pincode: tenant.pincode,
      currency: tenant.currency,
      timezone: tenant.timezone,
      status: tenant.status as any,
      branches,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    tenantId: string,
    userId: string,
    dto: UpdateTenantDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<TenantDetailResponse> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
      include: { branches: true },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'TENANT_PROFILE_UPDATED',
      resource: 'Tenant',
      resourceId: tenantId,
      details: dto,
      ipAddress,
      userAgent,
    });

    return this.getProfile(tenantId);
  }

  async getBranches(tenantId: string): Promise<BranchResponse[]> {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return branches.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      name: b.name,
      code: b.code,
      address: b.address,
      city: b.city,
      state: b.state,
      pincode: b.pincode,
      phone: b.phone,
      isMainBranch: b.isMainBranch,
      status: b.status as BranchStatus,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async createBranch(
    tenantId: string,
    userId: string,
    dto: CreateBranchDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<BranchResponse> {
    const existing = await this.prisma.branch.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Branch with code "${dto.code}" already exists for this gym`,
      );
    }

    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        phone: dto.phone,
        isMainBranch: dto.isMainBranch || false,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'BRANCH_CREATED',
      resource: 'Branch',
      resourceId: branch.id,
      details: { name: branch.name, code: branch.code },
      ipAddress,
      userAgent,
    });

    return {
      id: branch.id,
      tenantId: branch.tenantId,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      phone: branch.phone,
      isMainBranch: branch.isMainBranch,
      status: branch.status as BranchStatus,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    };
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    userId: string,
    dto: Partial<CreateBranchDto>,
    ipAddress: string,
    userAgent: string,
  ): Promise<BranchResponse> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found or belongs to another tenant');
    }

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'BRANCH_UPDATED',
      resource: 'Branch',
      resourceId: branchId,
      details: dto,
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      code: updated.code,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      pincode: updated.pincode,
      phone: updated.phone,
      isMainBranch: updated.isMainBranch,
      status: updated.status as BranchStatus,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
