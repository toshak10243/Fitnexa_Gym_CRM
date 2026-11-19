import { AccessDecisionService } from './access-decision.service';
import {
  AccessDecisionType,
  AccessReasonCode,
  MemberStatus,
  MembershipStatus,
  UserRole,
} from '@fitnexa/shared';

describe('AccessDecisionService', () => {
  let service: AccessDecisionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      member: {
        findFirst: jest.fn(),
      },
      attendancePolicy: {
        findFirst: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
      },
      accessDecision: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'decision-uuid-1',
          ...data,
        })),
      },
    };

    service = new AccessDecisionService(mockPrisma);
  });

  const tenantId = 'tenant-uuid-1';
  const branchId = 'branch-uuid-1';
  const memberId = 'member-uuid-1';

  it('grants entry for active member with active membership within dates', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: futureDate,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.ALLOWED);
    expect(result.reasonCode).toBe(AccessReasonCode.VALID_ACTIVE_MEMBERSHIP);
  });

  it('allows entry under active grace period when membership expired recently', async () => {
    const expiredYesterday = new Date(Date.now() - 1 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: expiredYesterday,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue({
      requireActiveMembership: true,
      allowGracePeriodDays: 3, // 3 days grace!
      restrictOnOutstandingDues: false,
      maxDuesThresholdInPaise: 0,
      enforceBranchAccess: true,
      allowOffPeakOnly: false,
    });
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.ALLOWED);
    expect(result.reasonCode).toBe(AccessReasonCode.GRACE_PERIOD_ACTIVE);
  });

  it('denies entry when membership is expired past grace window', async () => {
    const expiredTenDaysAgo = new Date(Date.now() - 10 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: expiredTenDaysAgo,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue({
      requireActiveMembership: true,
      allowGracePeriodDays: 3,
      restrictOnOutstandingDues: false,
      maxDuesThresholdInPaise: 0,
      enforceBranchAccess: true,
      allowOffPeakOnly: false,
    });
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.DENIED);
    expect(result.reasonCode).toBe(AccessReasonCode.MEMBERSHIP_EXPIRED);
  });

  it('denies entry when membership status is FROZEN', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.FROZEN,
          branchId,
          endDate: futureDate,
          freezeStartDate: new Date(),
          freezeEndDate: new Date(Date.now() + 7 * 86400000),
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.DENIED);
    expect(result.reasonCode).toBe(AccessReasonCode.MEMBERSHIP_FROZEN);
  });

  it('denies entry when member account is suspended by admin', async () => {
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.SUSPENDED,
      memberships: [],
    });

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.DENIED);
    expect(result.reasonCode).toBe(AccessReasonCode.MEMBER_ACCOUNT_SUSPENDED);
  });

  it('denies entry when attempting entry at unauthorized branch', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId: 'home-branch-id', // different from branchId
          endDate: futureDate,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue({
      enforceBranchAccess: true,
      requireActiveMembership: true,
      allowGracePeriodDays: 0,
      restrictOnOutstandingDues: false,
    });
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId: 'other-branch-id',
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.DENIED);
    expect(result.reasonCode).toBe(AccessReasonCode.BRANCH_ACCESS_RESTRICTED);
  });

  it('allows entry with warning when member has dues but restrictOnOutstandingDues is false', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: futureDate,
        },
      ],
    });

    // Default policy: restrictOnOutstandingDues = false
    mockPrisma.attendancePolicy.findFirst.mockResolvedValue({
      requireActiveMembership: true,
      allowGracePeriodDays: 0,
      restrictOnOutstandingDues: false,
      maxDuesThresholdInPaise: 0,
      enforceBranchAccess: true,
    });
    mockPrisma.invoice.findMany.mockResolvedValue([
      { balanceDueInPaise: 250000 }, // ₹2,500 due
    ]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    // CRITICAL INDIAN GYM BEHAVIOR: Entry is ALLOWED with pending dues warning!
    expect(result.decision).toBe(AccessDecisionType.ALLOWED);
    expect(result.reasonCode).toBe(AccessReasonCode.VALID_WITH_PENDING_DUES);
    expect(result.outstandingDuesPaise).toBe(250000);
  });

  it('blocks entry when gym policy explicitly enables restrictOnOutstandingDues', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: futureDate,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue({
      requireActiveMembership: true,
      allowGracePeriodDays: 0,
      restrictOnOutstandingDues: true,
      maxDuesThresholdInPaise: 0,
      enforceBranchAccess: true,
    });
    mockPrisma.invoice.findMany.mockResolvedValue([
      { balanceDueInPaise: 250000 },
    ]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
    });

    expect(result.decision).toBe(AccessDecisionType.DENIED);
    expect(result.reasonCode).toBe(AccessReasonCode.OUTSTANDING_DUES_BLOCK);
  });

  it('allows owner to override denied access attempt with mandatory audit reason', async () => {
    const expiredTenDaysAgo = new Date(Date.now() - 10 * 86400000);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: memberId,
      tenantId,
      status: MemberStatus.ACTIVE,
      memberships: [
        {
          id: 'mem-1',
          status: MembershipStatus.ACTIVE,
          branchId,
          endDate: expiredTenDaysAgo,
        },
      ],
    });

    mockPrisma.attendancePolicy.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.evaluate({
      tenantId,
      branchId,
      memberId,
      override: true,
      overrideUserId: 'owner-uuid-1',
      overrideReason: 'Member promised renewal tomorrow evening',
      evaluatingUserRole: UserRole.GYM_OWNER,
    });

    expect(result.decision).toBe(AccessDecisionType.OVERRIDDEN);
    expect(result.reasonCode).toBe(AccessReasonCode.MANUAL_OVERRIDE);
    expect(result.overridden).toBe(true);
  });
});
