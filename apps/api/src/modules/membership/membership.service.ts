import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { FreezeMembershipDto } from './dto/freeze-membership.dto';
import { UnfreezeMembershipDto } from './dto/unfreeze-membership.dto';
import { CancelMembershipDto } from './dto/cancel-membership.dto';
import { MembershipStatus } from '@prisma/client';
import {
  calculateMembershipEndDate,
  calculateDaysBetween,
  addDaysToDate,
} from '../../common/utils/date.util';

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Assign a membership plan to a member
   */
  async assign(tenantId: string, currentUserId: string, dto: AssignMembershipDto) {
    const [member, plan, branch] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } }),
      this.prisma.membershipPlan.findFirst({ where: { id: dto.planId, tenantId, isActive: true } }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
    ]);

    if (!member) throw new NotFoundException('Member not found');
    if (!plan) throw new BadRequestException('Membership plan not found or inactive');
    if (!branch) throw new BadRequestException('Branch not found');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = calculateMembershipEndDate(startDate, plan.durationType, plan.durationValue);

    const pricePaidInPaise = dto.customPriceInPaise ?? plan.priceInPaise;
    const taxRateBps = plan.taxRateBps ?? 1800;

    let taxPaidInPaise = 0;
    if (plan.isTaxInclusive) {
      taxPaidInPaise = Math.round((pricePaidInPaise * taxRateBps) / (10000 + taxRateBps));
    } else {
      taxPaidInPaise = Math.round((pricePaidInPaise * taxRateBps) / 10000);
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memberMembership.create({
        data: {
          tenantId,
          memberId: member.id,
          planId: plan.id,
          branchId: branch.id,
          startDate,
          endDate,
          pricePaidInPaise,
          taxPaidInPaise,
          status: MembershipStatus.ACTIVE,
          assignedBy: currentUserId,
        },
        include: {
          plan: true,
          branch: true,
        },
      });

      await tx.membershipStatusHistory.create({
        data: {
          memberMembershipId: created.id,
          fromStatus: MembershipStatus.PENDING,
          toStatus: MembershipStatus.ACTIVE,
          reason: 'Initial Plan Enrollment',
          changedBy: currentUserId,
        },
      });

      await tx.memberActivity.create({
        data: {
          memberId: member.id,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBERSHIP_ENROLLED',
          details: {
            planName: plan.name,
            duration: `${plan.durationValue} ${plan.durationType}`,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            pricePaidInPaise,
          },
        },
      });

      return created;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_ASSIGNED',
      resource: 'MemberMembership',
      resourceId: membership.id,
      details: {
        memberId: member.id,
        planId: plan.id,
        pricePaidInPaise,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    if (member.email) {
      try {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, address: true, phone: true, logoUrl: true, website: true } });
        await this.mailService.sendMembershipAssignedEmail({ to: member.email, memberName: member.fullName, memberCode: member.memberCode, gymName: tenant?.name || branch.name, planName: plan.name, startDate, endDate, amountInPaise: pricePaidInPaise, taxInPaise: taxPaidInPaise, address: tenant?.address, phone: tenant?.phone, logoUrl: tenant?.logoUrl, website: tenant?.website });
      } catch (error) { console.error('Membership confirmation email delivery failed', error instanceof Error ? error.message : error); }
    }

    return membership;
  }

  /**
   * Freeze an active membership
   */
  async freeze(
    tenantId: string,
    membershipId: string,
    currentUserId: string,
    dto: FreezeMembershipDto,
  ) {
    const membership = await this.prisma.memberMembership.findFirst({
      where: { id: membershipId, tenantId },
      include: { plan: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership record not found');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException(`Cannot freeze membership in status "${membership.status}"`);
    }

    const freezeStart = new Date(dto.freezeStartDate);
    const freezeEnd = new Date(dto.freezeEndDate);

    if (freezeEnd < freezeStart) {
      throw new BadRequestException('Freeze end date cannot be before freeze start date');
    }

    const requestedDays = calculateDaysBetween(freezeStart, freezeEnd);
    const maxAllowed = membership.plan.maxFreezeDays;

    if (maxAllowed <= 0) {
      throw new BadRequestException('Freezing is not allowed for this membership plan');
    }

    if (membership.totalFreezeDaysUsed + requestedDays > maxAllowed) {
      throw new BadRequestException(
        `Requested ${requestedDays} days exceeds remaining allowance (${maxAllowed - membership.totalFreezeDaysUsed} days remaining of ${maxAllowed} total allowed)`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.memberMembership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.FROZEN,
          freezeStartDate: freezeStart,
          freezeEndDate: freezeEnd,
        },
      });

      await tx.membershipStatusHistory.create({
        data: {
          memberMembershipId: membershipId,
          fromStatus: MembershipStatus.ACTIVE,
          toStatus: MembershipStatus.FROZEN,
          reason: dto.reason || 'Requested membership freeze',
          changedBy: currentUserId,
        },
      });

      await tx.memberActivity.create({
        data: {
          memberId: membership.memberId,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBERSHIP_FROZEN',
          details: {
            requestedDays,
            freezeStartDate: dto.freezeStartDate,
            freezeEndDate: dto.freezeEndDate,
            reason: dto.reason,
          },
        },
      });

      return result;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_FROZEN',
      resource: 'MemberMembership',
      resourceId: membershipId,
      details: { requestedDays, reason: dto.reason },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }

  /**
   * Unfreeze membership and extend end date by the duration frozen
   */
  async unfreeze(
    tenantId: string,
    membershipId: string,
    currentUserId: string,
    dto: UnfreezeMembershipDto,
  ) {
    const membership = await this.prisma.memberMembership.findFirst({
      where: { id: membershipId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership record not found');
    }

    if (membership.status !== MembershipStatus.FROZEN) {
      throw new BadRequestException(`Cannot unfreeze membership that is not frozen (current status: ${membership.status})`);
    }

    const freezeStart = membership.freezeStartDate || new Date();
    const today = new Date();
    // Days actually frozen
    const daysFrozen = calculateDaysBetween(freezeStart, today);

    // Extend end date by the frozen days
    const extendedEndDate = addDaysToDate(membership.endDate, daysFrozen);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.memberMembership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.ACTIVE,
          endDate: extendedEndDate,
          freezeStartDate: null,
          freezeEndDate: null,
          totalFreezeDaysUsed: membership.totalFreezeDaysUsed + daysFrozen,
        },
      });

      await tx.membershipStatusHistory.create({
        data: {
          memberMembershipId: membershipId,
          fromStatus: MembershipStatus.FROZEN,
          toStatus: MembershipStatus.ACTIVE,
          reason: dto.reason || `Unfrozen after ${daysFrozen} days. End date extended to ${extendedEndDate.toISOString().split('T')[0]}`,
          changedBy: currentUserId,
        },
      });

      await tx.memberActivity.create({
        data: {
          memberId: membership.memberId,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBERSHIP_UNFROZEN',
          details: {
            daysFrozen,
            newEndDate: extendedEndDate.toISOString().split('T')[0],
          },
        },
      });

      return result;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_UNFROZEN',
      resource: 'MemberMembership',
      resourceId: membershipId,
      details: { daysFrozen, newEndDate: extendedEndDate },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }

  /**
   * Cancel an active or frozen membership
   */
  async cancel(
    tenantId: string,
    membershipId: string,
    currentUserId: string,
    dto: CancelMembershipDto,
  ) {
    const membership = await this.prisma.memberMembership.findFirst({
      where: { id: membershipId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership record not found');
    }

    if (membership.status === MembershipStatus.CANCELLED) {
      throw new BadRequestException('Membership is already cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.memberMembership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.cancellationReason.trim(),
        },
      });

      await tx.membershipStatusHistory.create({
        data: {
          memberMembershipId: membershipId,
          fromStatus: membership.status,
          toStatus: MembershipStatus.CANCELLED,
          reason: dto.cancellationReason.trim(),
          changedBy: currentUserId,
        },
      });

      await tx.memberActivity.create({
        data: {
          memberId: membership.memberId,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBERSHIP_CANCELLED',
          details: {
            cancellationReason: dto.cancellationReason,
          },
        },
      });

      return result;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBERSHIP_CANCELLED',
      resource: 'MemberMembership',
      resourceId: membershipId,
      details: { cancellationReason: dto.cancellationReason },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }
}
