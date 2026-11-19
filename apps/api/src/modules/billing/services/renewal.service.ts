import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';
import { CreateRenewalDto } from '../dto/create-renewal.dto';
import {
  calculateMembershipEndDate,
  addDaysToDate,
} from '../../../common/utils/date.util';
import { MembershipStatus, PaymentMethodType } from '@prisma/client';

@Injectable()
export class RenewalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Seamless membership renewal with continuous subscription chaining and invoice generation
   */
  async renew(tenantId: string, currentUserId: string, dto: CreateRenewalDto) {
    const [member, plan, branch] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } }),
      this.prisma.membershipPlan.findFirst({ where: { id: dto.planId, tenantId } }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
    ]);

    if (!member) throw new NotFoundException('Member record not found');
    if (!plan) throw new BadRequestException('Target plan not found');
    if (!branch) throw new BadRequestException('Target branch not found');

    const today = new Date();
    let startDate: Date;

    // Determine chained start date
    if (dto.currentMembershipId) {
      const current = await this.prisma.memberMembership.findFirst({
        where: { id: dto.currentMembershipId, tenantId },
      });
      if (current && new Date(current.endDate) >= today) {
        // Continuous chaining: start day after previous plan expires
        startDate = addDaysToDate(new Date(current.endDate), 1);
      } else {
        startDate = dto.startDate ? new Date(dto.startDate) : today;
      }
    } else {
      startDate = dto.startDate ? new Date(dto.startDate) : today;
    }

    const endDate = calculateMembershipEndDate(startDate, plan.durationType, plan.durationValue);
    const priceInPaise = dto.customPriceInPaise ?? plan.priceInPaise;
    const taxRateBps = plan.taxRateBps ?? 1800;

    const hasImmediateDownPayment = (dto.downPaymentInPaise || 0) > 0;
    const initialStatus = hasImmediateDownPayment ? MembershipStatus.ACTIVE : MembershipStatus.PENDING;

    // 1. Create renewal membership record
    const membership = await this.prisma.memberMembership.create({
      data: {
        tenantId,
        memberId: member.id,
        planId: plan.id,
        branchId: branch.id,
        startDate,
        endDate,
        pricePaidInPaise: priceInPaise,
        taxPaidInPaise: Math.round((priceInPaise * taxRateBps) / 10000),
        status: initialStatus,
        assignedBy: currentUserId,
      },
      include: { plan: true },
    });

    await this.prisma.membershipStatusHistory.create({
      data: {
        memberMembershipId: membership.id,
        fromStatus: MembershipStatus.PENDING,
        toStatus: initialStatus,
        reason: 'Membership renewal initiated',
        changedBy: currentUserId,
      },
    });

    // 2. Generate renewal invoice
    const dueDate = dto.dueDate || new Date(startDate).toISOString().split('T')[0];
    const invoice = await this.invoiceService.create(tenantId, currentUserId, {
      memberId: member.id,
      branchId: branch.id,
      membershipId: membership.id,
      invoiceDate: today.toISOString().split('T')[0],
      dueDate,
      isTaxInclusive: plan.isTaxInclusive,
      notes: `Renewal for ${plan.name} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`,
      lineItems: [
        {
          description: `Membership Renewal: ${plan.name}`,
          quantity: 1,
          unitPriceInPaise: priceInPaise,
          taxRateBps,
          itemType: 'PLAN',
          referenceId: plan.id,
        },
      ],
    });

    // 3. Process immediate down payment if collected at renewal
    let payment = null;
    if (hasImmediateDownPayment) {
      payment = await this.paymentService.create(tenantId, currentUserId, {
        memberId: member.id,
        branchId: branch.id,
        amountInPaise: dto.downPaymentInPaise!,
        method: (dto.downPaymentMethod || PaymentMethodType.UPI) as any,
        referenceNumber: dto.downPaymentReference,
        notes: `Immediate renewal deposit for Invoice ${invoice.invoiceNumber}`,
        allocations: [
          {
            invoiceId: invoice.id,
            amountInPaise: Math.min(dto.downPaymentInPaise!, invoice.grandTotalInPaise),
          },
        ],
      });
    }

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_RENEWED',
      resource: 'MemberMembership',
      resourceId: membership.id,
      details: {
        memberId: member.id,
        planName: plan.name,
        invoiceNumber: invoice.invoiceNumber,
        downPaymentInPaise: dto.downPaymentInPaise,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return {
      membership,
      invoice,
      payment,
    };
  }

  /**
   * Find members whose subscriptions expire within N days
   */
  async getExpiringMemberships(tenantId: string, daysAhead: number = 30) {
    const today = new Date();
    const threshold = addDaysToDate(today, daysAhead);

    return this.prisma.memberMembership.findMany({
      where: {
        tenantId,
        status: MembershipStatus.ACTIVE,
        endDate: {
          gte: today,
          lte: threshold,
        },
      },
      orderBy: { endDate: 'asc' },
      include: {
        member: {
          select: { id: true, fullName: true, memberCode: true, phone: true },
        },
        plan: {
          select: { name: true, durationValue: true, durationType: true },
        },
        branch: {
          select: { name: true },
        },
      },
    });
  }
}
