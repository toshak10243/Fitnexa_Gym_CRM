import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateMembershipPlanDto } from './dto/create-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MembershipPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new membership plan
   */
  async create(tenantId: string, currentUserId: string, dto: CreateMembershipPlanDto) {
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found or belongs to another organization');
      }
    }

    const existingName = await this.prisma.membershipPlan.findFirst({
      where: { tenantId, name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existingName) {
      throw new ConflictException(`A plan named "${dto.name}" already exists in your gym catalog`);
    }

    const plan = await this.prisma.membershipPlan.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        name: dto.name.trim(),
        code: dto.code ? dto.code.trim().toUpperCase() : null,
        description: dto.description?.trim() || null,
        durationType: dto.durationType,
        durationValue: dto.durationValue,
        priceInPaise: dto.priceInPaise,
        joiningFeeInPaise: dto.joiningFeeInPaise || 0,
        taxRateBps: dto.taxRateBps ?? 1800,
        isTaxInclusive: dto.isTaxInclusive || false,
        maxFreezeDays: dto.maxFreezeDays || 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_PLAN_CREATED',
      resource: 'MembershipPlan',
      resourceId: plan.id,
      details: {
        name: plan.name,
        priceInPaise: plan.priceInPaise,
        duration: `${plan.durationValue} ${plan.durationType}`,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return plan;
  }

  /**
   * List all membership plans for tenant with optional filters
   */
  async findAll(tenantId: string, query: PlanQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MembershipPlanWhereInput = { tenantId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.branchId) {
      where.OR = [{ branchId: query.branchId }, { branchId: null }];
    }

    if (query.search && query.search.trim().length > 0) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.membershipPlan.count({ where }),
      this.prisma.membershipPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { priceInPaise: 'asc' }],
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { memberMemberships: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find plan by ID
   */
  async findById(tenantId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id, tenantId },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { memberMemberships: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    return plan;
  }

  /**
   * Update plan details with price modification auditing
   */
  async update(tenantId: string, id: string, currentUserId: string, dto: UpdateMembershipPlanDto) {
    const existing = await this.prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Membership plan not found');
    }

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.membershipPlan.findFirst({
        where: { tenantId, name: { equals: dto.name.trim(), mode: 'insensitive' }, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException(`Another plan with name "${dto.name}" already exists.`);
      }
    }

    const priceChanged =
      dto.priceInPaise !== undefined && dto.priceInPaise !== existing.priceInPaise;

    const updated = await this.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
        description: dto.description?.trim(),
        durationType: dto.durationType,
        durationValue: dto.durationValue,
        priceInPaise: dto.priceInPaise,
        joiningFeeInPaise: dto.joiningFeeInPaise,
        taxRateBps: dto.taxRateBps,
        isTaxInclusive: dto.isTaxInclusive,
        maxFreezeDays: dto.maxFreezeDays,
        branchId: dto.branchId === '' ? null : dto.branchId,
        isActive: dto.isActive,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: priceChanged ? 'MEMBERSHIP_PLAN_PRICE_MODIFIED' : 'MEMBERSHIP_PLAN_UPDATED',
      resource: 'MembershipPlan',
      resourceId: id,
      details: {
        oldPrice: existing.priceInPaise,
        newPrice: updated.priceInPaise,
        changes: dto,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }
}
