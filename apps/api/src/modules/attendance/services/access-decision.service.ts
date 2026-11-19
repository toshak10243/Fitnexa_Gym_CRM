import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  AccessDecisionType,
  AccessReasonCode,
  MemberStatus,
  MembershipStatus,
  UserRole,
} from '@fitnexa/shared';

export interface EvaluateAccessParams {
  tenantId: string;
  branchId: string;
  memberId: string;
  deviceId?: string;
  override?: boolean;
  overrideUserId?: string;
  overrideReason?: string;
  evaluatingUserRole?: UserRole;
  now?: Date;
}

export interface AccessDecisionResult {
  decision: AccessDecisionType;
  reasonCode: AccessReasonCode;
  reasonDetails: string;
  outstandingDuesPaise: number;
  memberId: string;
  membershipId?: string;
  accessDecisionId?: string;
  canOverride: boolean;
  overridden: boolean;
}

@Injectable()
export class AccessDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoritative rule evaluation for gym entry
   */
  async evaluate(params: EvaluateAccessParams): Promise<AccessDecisionResult> {
    const {
      tenantId,
      branchId,
      memberId,
      deviceId,
      now = new Date(),
    } = params;

    // 1. Fetch Member details
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      include: {
        memberships: {
          orderBy: { endDate: 'desc' },
          include: { plan: true },
        },
      },
    });

    if (!member) {
      return this.recordDecision(tenantId, branchId, null, deviceId, {
        decision: AccessDecisionType.DENIED,
        reasonCode: AccessReasonCode.UNMAPPED_DEVICE_USER,
        reasonDetails: 'Member record not found or does not belong to authorized tenant.',
        outstandingDuesPaise: 0,
        canOverride: false,
        overridden: false,
      });
    }

    // 2. Member account status check
    if (member.status === MemberStatus.SUSPENDED) {
      return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
        decision: AccessDecisionType.DENIED,
        reasonCode: AccessReasonCode.MEMBER_ACCOUNT_SUSPENDED,
        reasonDetails: 'Member account is currently suspended by administration.',
        outstandingDuesPaise: 0,
        canOverride: true,
      }, params);
    }

    // 3. Fetch applicable attendance policy (branch-specific or tenant fallback)
    const policy =
      (await this.prisma.attendancePolicy.findFirst({
        where: { tenantId, branchId },
      })) ||
      (await this.prisma.attendancePolicy.findFirst({
        where: { tenantId, branchId: null },
      })) || {
        requireActiveMembership: true,
        allowGracePeriodDays: 0,
        restrictOnOutstandingDues: false,
        maxDuesThresholdInPaise: 0,
        enforceBranchAccess: true,
        allowOffPeakOnly: false,
        offPeakStartMinutes: null,
        offPeakEndMinutes: null,
        allowOwnerOverride: true,
        allowManagerOverride: true,
      };

    // 4. Calculate outstanding dues (sum of unpaid invoices)
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        memberId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { balanceDueInPaise: true },
    });

    const totalOutstandingDuesPaise = unpaidInvoices.reduce(
      (sum, inv) => sum + inv.balanceDueInPaise,
      0,
    );

    // 5. Evaluate Memberships
    const activeMemberships = member.memberships.filter(
      (m) => m.status !== MembershipStatus.CANCELLED,
    );

    if (activeMemberships.length === 0 && policy.requireActiveMembership) {
      return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
        decision: AccessDecisionType.DENIED,
        reasonCode: AccessReasonCode.MEMBERSHIP_EXPIRED,
        reasonDetails: 'No active or valid membership plan found for member.',
        outstandingDuesPaise: totalOutstandingDuesPaise,
        canOverride: true,
      }, params);
    }

    // Check primary active or latest membership
    const primaryMembership = activeMemberships[0];

    if (primaryMembership) {
      // Frozen membership restriction
      if (primaryMembership.status === MembershipStatus.FROZEN) {
        return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
          decision: AccessDecisionType.DENIED,
          reasonCode: AccessReasonCode.MEMBERSHIP_FROZEN,
          reasonDetails: `Membership is frozen from ${primaryMembership.freezeStartDate?.toISOString().split('T')[0]} to ${primaryMembership.freezeEndDate?.toISOString().split('T')[0]}.`,
          outstandingDuesPaise: totalOutstandingDuesPaise,
          membershipId: primaryMembership.id,
          canOverride: true,
        }, params);
      }

      // Pending payment check
      if (primaryMembership.status === MembershipStatus.PENDING) {
        return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
          decision: AccessDecisionType.DENIED,
          reasonCode: AccessReasonCode.MEMBERSHIP_PENDING_PAYMENT,
          reasonDetails: 'Membership plan enrollment is pending initial fee settlement.',
          outstandingDuesPaise: totalOutstandingDuesPaise,
          membershipId: primaryMembership.id,
          canOverride: true,
        }, params);
      }

      // Branch roaming restriction
      if (policy.enforceBranchAccess && primaryMembership.branchId !== branchId) {
        return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
          decision: AccessDecisionType.DENIED,
          reasonCode: AccessReasonCode.BRANCH_ACCESS_RESTRICTED,
          reasonDetails: 'Membership is restricted to home branch and roaming is not enabled.',
          outstandingDuesPaise: totalOutstandingDuesPaise,
          membershipId: primaryMembership.id,
          canOverride: true,
        }, params);
      }

      // Membership validity & Grace period evaluation
      const todayDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const endDateOnly = new Date(
        Date.UTC(
          primaryMembership.endDate.getUTCFullYear(),
          primaryMembership.endDate.getUTCMonth(),
          primaryMembership.endDate.getUTCDate(),
        ),
      );

      const daysPastExpiry = Math.floor(
        (todayDateOnly.getTime() - endDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysPastExpiry > 0) {
        if (daysPastExpiry <= policy.allowGracePeriodDays) {
          // Grace period active!
          return this.recordDecision(tenantId, branchId, memberId, deviceId, {
            decision: AccessDecisionType.ALLOWED,
            reasonCode: AccessReasonCode.GRACE_PERIOD_ACTIVE,
            reasonDetails: `Membership expired ${daysPastExpiry} day(s) ago; allowed under grace period of ${policy.allowGracePeriodDays} days.`,
            outstandingDuesPaise: totalOutstandingDuesPaise,
            membershipId: primaryMembership.id,
            canOverride: false,
            overridden: false,
          });
        } else if (policy.requireActiveMembership) {
          return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
            decision: AccessDecisionType.DENIED,
            reasonCode: AccessReasonCode.MEMBERSHIP_EXPIRED,
            reasonDetails: `Membership expired on ${primaryMembership.endDate.toISOString().split('T')[0]}. Grace period exceeded.`,
            outstandingDuesPaise: totalOutstandingDuesPaise,
            membershipId: primaryMembership.id,
            canOverride: true,
          }, params);
        }
      }

      // Off-peak allowed entry hours
      if (policy.allowOffPeakOnly && policy.offPeakStartMinutes !== null && policy.offPeakEndMinutes !== null) {
        // Calculate minutes from midnight in Asia/Kolkata (+5:30)
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffsetMs);
        const currentMinuteOfDay = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

        if (
          currentMinuteOfDay < policy.offPeakStartMinutes ||
          currentMinuteOfDay > policy.offPeakEndMinutes
        ) {
          return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
            decision: AccessDecisionType.DENIED,
            reasonCode: AccessReasonCode.OUTSIDE_ALLOWED_TIME_WINDOW,
            reasonDetails: `Entry attempted outside allowed off-peak window (${Math.floor(policy.offPeakStartMinutes / 60)}:00 - ${Math.floor(policy.offPeakEndMinutes / 60)}:00 IST).`,
            outstandingDuesPaise: totalOutstandingDuesPaise,
            membershipId: primaryMembership.id,
            canOverride: true,
          }, params);
        }
      }
    }

    // 6. Configurable Outstanding Dues Evaluation
    if (policy.restrictOnOutstandingDues) {
      if (totalOutstandingDuesPaise > policy.maxDuesThresholdInPaise) {
        return this.handlePotentialOverride(tenantId, branchId, memberId, deviceId, {
          decision: AccessDecisionType.DENIED,
          reasonCode: AccessReasonCode.OUTSTANDING_DUES_BLOCK,
          reasonDetails: `Entry blocked due to outstanding balance of ₹${(totalOutstandingDuesPaise / 100).toFixed(2)}, exceeding policy threshold of ₹${(policy.maxDuesThresholdInPaise / 100).toFixed(2)}.`,
          outstandingDuesPaise: totalOutstandingDuesPaise,
          membershipId: primaryMembership?.id,
          canOverride: true,
        }, params);
      }
    }

    // 7. Successful Entry Allowed
    const hasDues = totalOutstandingDuesPaise > 0;
    return this.recordDecision(tenantId, branchId, memberId, deviceId, {
      decision: AccessDecisionType.ALLOWED,
      reasonCode: hasDues
        ? AccessReasonCode.VALID_WITH_PENDING_DUES
        : AccessReasonCode.VALID_ACTIVE_MEMBERSHIP,
      reasonDetails: hasDues
        ? `Valid active membership. Note: Pending balance of ₹${(totalOutstandingDuesPaise / 100).toFixed(2)} recorded on account.`
        : 'Valid active membership. Access granted.',
      outstandingDuesPaise: totalOutstandingDuesPaise,
      membershipId: primaryMembership?.id,
      canOverride: false,
      overridden: false,
    });
  }

  /**
   * Checks whether caller is authorized to override a denied access attempt
   */
  private async handlePotentialOverride(
    tenantId: string,
    branchId: string,
    memberId: string,
    deviceId: string | undefined,
    denial: {
      decision: AccessDecisionType;
      reasonCode: AccessReasonCode;
      reasonDetails: string;
      outstandingDuesPaise: number;
      membershipId?: string;
      canOverride: boolean;
    },
    params: EvaluateAccessParams,
  ): Promise<AccessDecisionResult> {
    const { override, overrideUserId, overrideReason, evaluatingUserRole } = params;

    // Check if override is actively requested and authorized
    if (override && overrideUserId && overrideReason?.trim()) {
      const isAuthorizedRole =
        evaluatingUserRole === UserRole.GYM_OWNER ||
        evaluatingUserRole === UserRole.BRANCH_MANAGER ||
        evaluatingUserRole === UserRole.SUPER_ADMIN;

      if (isAuthorizedRole) {
        return this.recordDecision(tenantId, branchId, memberId, deviceId, {
          decision: AccessDecisionType.OVERRIDDEN,
          reasonCode: AccessReasonCode.MANUAL_OVERRIDE,
          reasonDetails: `Overridden by ${evaluatingUserRole}. Original denial: [${denial.reasonCode}] ${denial.reasonDetails}. Reason: ${overrideReason}`,
          outstandingDuesPaise: denial.outstandingDuesPaise,
          membershipId: denial.membershipId,
          canOverride: true,
          overridden: true,
          overrideUserId,
          overrideReason,
        });
      }
    }

    return this.recordDecision(tenantId, branchId, memberId, deviceId, {
      decision: denial.decision,
      reasonCode: denial.reasonCode,
      reasonDetails: denial.reasonDetails,
      outstandingDuesPaise: denial.outstandingDuesPaise,
      membershipId: denial.membershipId,
      canOverride: denial.canOverride,
      overridden: false,
    });
  }

  /**
   * Atomically records the access decision into the audit log
   */
  private async recordDecision(
    tenantId: string,
    branchId: string,
    memberId: string | null,
    deviceId: string | undefined,
    result: {
      decision: AccessDecisionType;
      reasonCode: AccessReasonCode;
      reasonDetails: string;
      outstandingDuesPaise: number;
      membershipId?: string;
      canOverride: boolean;
      overridden: boolean;
      overrideUserId?: string;
      overrideReason?: string;
    },
  ): Promise<AccessDecisionResult> {
    const record = await this.prisma.accessDecision.create({
      data: {
        tenantId,
        branchId,
        memberId: memberId || undefined,
        deviceId: deviceId || undefined,
        decision: result.decision,
        reasonCode: result.reasonCode,
        reasonDetails: result.reasonDetails,
        outstandingDuesPaise: result.outstandingDuesPaise,
        overriddenByUserId: result.overrideUserId || undefined,
        overrideReason: result.overrideReason || undefined,
      },
    });

    return {
      decision: result.decision,
      reasonCode: result.reasonCode,
      reasonDetails: result.reasonDetails,
      outstandingDuesPaise: result.outstandingDuesPaise,
      memberId: memberId || '',
      membershipId: result.membershipId,
      accessDecisionId: record.id,
      canOverride: result.canOverride,
      overridden: result.overridden,
    };
  }
}
