import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AccessDecisionService } from './access-decision.service';
import { CheckInDto, CheckOutDto } from '../dto/check-in.dto';
import { AttendanceQueryDto, ActiveSessionQueryDto } from '../dto/attendance-query.dto';
import { CreateAttendanceCorrectionDto } from '../dto/correction.dto';
import { UpdateAttendancePolicyDto } from '../dto/policy.dto';
import {
  AccessDecisionType,
  AttendanceDirection,
  AttendanceSourceType,
  SessionStatus,
  CorrectionStatus,
  UserRole,
} from '@fitnexa/shared';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessDecisionService: AccessDecisionService,
  ) {}

  /**
   * Process gym check-in (Manual front-desk or Biometric device ingestion)
   */
  async checkIn(
    tenantId: string,
    recordedByUserId: string | undefined,
    userRole: UserRole | undefined,
    dto: CheckInDto,
  ) {
    const now = new Date();

    // 1. Fetch policy for window durations
    const policy =
      (await this.prisma.attendancePolicy.findFirst({
        where: { tenantId, branchId: dto.branchId },
      })) ||
      (await this.prisma.attendancePolicy.findFirst({
        where: { tenantId, branchId: null },
      })) || {
        duplicateCheckinWindowMinutes: 15,
        autoCheckoutAfterHours: 4,
      };

    // 2. Duplicate tap debouncing check
    const duplicateWindowMs = policy.duplicateCheckinWindowMinutes * 60 * 1000;
    const recentCheckIn = await this.prisma.memberAttendance.findFirst({
      where: {
        tenantId,
        memberId: dto.memberId,
        direction: AttendanceDirection.CHECK_IN,
        timestamp: { gte: new Date(now.getTime() - duplicateWindowMs) },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentCheckIn) {
      // Check if member already checked out since that check-in
      const checkOutAfter = await this.prisma.memberAttendance.findFirst({
        where: {
          tenantId,
          memberId: dto.memberId,
          direction: AttendanceDirection.CHECK_OUT,
          timestamp: { gte: recentCheckIn.timestamp },
        },
      });

      if (!checkOutAfter) {
        throw new ConflictException(
          `Duplicate check-in tap ignored. Member checked in ${Math.round(
            (now.getTime() - recentCheckIn.timestamp.getTime()) / 60000,
          )} minute(s) ago.`,
        );
      }
    }

    // 3. Existing active session check
    const existingActiveSession = await this.prisma.attendanceSession.findFirst({
      where: {
        tenantId,
        memberId: dto.memberId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (existingActiveSession) {
      // Check if active session is already stale (over autoCheckoutAfterHours)
      const maxDurationMs = policy.autoCheckoutAfterHours * 60 * 60 * 1000;
      if (now.getTime() - existingActiveSession.checkInTime.getTime() > maxDurationMs) {
        // Auto-close previous stale session
        await this.prisma.attendanceSession.update({
          where: { id: existingActiveSession.id },
          data: {
            status: SessionStatus.AUTO_CLOSED,
            closeReason: 'TIMEOUT_EXCEEDED',
            checkOutTime: new Date(
              existingActiveSession.checkInTime.getTime() + maxDurationMs,
            ),
            durationInMinutes: policy.autoCheckoutAfterHours * 60,
          },
        });
      } else {
        throw new ConflictException(
          `Member already has an active gym session checked in at ${existingActiveSession.checkInTime.toLocaleTimeString(
            'en-IN',
          )}. Please check out first.`,
        );
      }
    }

    // 4. Access decision evaluation
    const evaluation = await this.accessDecisionService.evaluate({
      tenantId,
      branchId: dto.branchId,
      memberId: dto.memberId,
      deviceId: dto.deviceId,
      override: dto.override,
      overrideUserId: recordedByUserId,
      overrideReason: dto.overrideReason,
      evaluatingUserRole: userRole,
      now,
    });

    if (evaluation.decision === AccessDecisionType.DENIED) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Entry Denied: ${evaluation.reasonDetails}`,
        reasonCode: evaluation.reasonCode,
        outstandingDuesPaise: evaluation.outstandingDuesPaise,
        canOverride: evaluation.canOverride,
      });
    }

    // 5. Atomic check-in recording transaction
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.memberAttendance.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId: dto.memberId,
          accessDecisionId: evaluation.accessDecisionId,
          deviceId: dto.deviceId || undefined,
          direction: AttendanceDirection.CHECK_IN,
          source: dto.source || AttendanceSourceType.MANUAL_FRONT_DESK,
          timestamp: now,
          recordedByUserId,
        },
      });

      const session = await tx.attendanceSession.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId: dto.memberId,
          checkInAttendanceId: attendance.id,
          checkInTime: now,
          status: SessionStatus.ACTIVE,
        },
      });

      await tx.memberAttendance.update({
        where: { id: attendance.id },
        data: { sessionId: session.id },
      });

      // Log member activity
      await tx.memberActivity.create({
        data: {
          tenantId,
          memberId: dto.memberId,
          action: 'GYM_CHECK_IN',
          details: {
            source: dto.source || 'MANUAL_FRONT_DESK',
            overridden: evaluation.overridden,
          },
          performedBy: recordedByUserId,
        },
      });

      return {
        session,
        attendance,
        evaluation,
      };
    });
  }

  /**
   * Process gym check-out
   */
  async checkOut(
    tenantId: string,
    recordedByUserId: string | undefined,
    dto: CheckOutDto,
  ) {
    const now = new Date();

    // 1. Locate active session for member
    const activeSession = await this.prisma.attendanceSession.findFirst({
      where: {
        tenantId,
        memberId: dto.memberId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!activeSession) {
      throw new NotFoundException('No active gym session found for this member.');
    }

    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - activeSession.checkInTime.getTime()) / 60000),
    );

    // 2. Atomic check-out recording transaction
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.memberAttendance.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId: dto.memberId,
          sessionId: activeSession.id,
          deviceId: dto.deviceId || undefined,
          direction: AttendanceDirection.CHECK_OUT,
          source: dto.source || AttendanceSourceType.MANUAL_FRONT_DESK,
          timestamp: now,
          recordedByUserId,
        },
      });

      const completedSession = await tx.attendanceSession.update({
        where: { id: activeSession.id },
        data: {
          checkOutAttendanceId: attendance.id,
          checkOutTime: now,
          durationInMinutes: durationMinutes,
          status: SessionStatus.COMPLETED,
          closeReason: 'NORMAL_CHECKOUT',
        },
      });

      // Log member activity
      await tx.memberActivity.create({
        data: {
          tenantId,
          memberId: dto.memberId,
          action: 'GYM_CHECK_OUT',
          details: {
            durationMinutes,
            source: dto.source || 'MANUAL_FRONT_DESK',
          },
          performedBy: recordedByUserId,
        },
      });

      return {
        session: completedSession,
        attendance,
      };
    });
  }

  /**
   * Real-time active sessions currently inside the facility
   */
  async getActiveSessions(tenantId: string, query: ActiveSessionQueryDto) {
    const { page = 1, limit = 50, branchId, status = SessionStatus.ACTIVE, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status,
    };

    if (branchId) where.branchId = branchId;
    if (search) {
      where.member = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { memberCode: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              memberCode: true,
              phone: true,
              photoUrl: true,
              emergencyContact: true,
            },
          },
          branch: { select: { id: true, name: true } },
        },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Real-time gym occupancy KPIs
   */
  async getOccupancySummary(tenantId: string, branchId?: string) {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    const branchFilter = branchId ? { branchId } : {};

    const [currentlyCheckedIn, todayTotalCheckins, uniqueMembersGroup, todayDeniedAttempts] =
      await Promise.all([
        this.prisma.attendanceSession.count({
          where: {
            tenantId,
            ...branchFilter,
            status: SessionStatus.ACTIVE,
          },
        }),
        this.prisma.memberAttendance.count({
          where: {
            tenantId,
            ...branchFilter,
            direction: AttendanceDirection.CHECK_IN,
            timestamp: { gte: todayStart },
          },
        }),
        this.prisma.memberAttendance.groupBy({
          by: ['memberId'],
          where: {
            tenantId,
            ...branchFilter,
            direction: AttendanceDirection.CHECK_IN,
            timestamp: { gte: todayStart },
          },
        }),
        this.prisma.accessDecision.count({
          where: {
            tenantId,
            ...branchFilter,
            decision: AccessDecisionType.DENIED,
            timestamp: { gte: todayStart },
          },
        }),
      ]);

    return {
      currentlyCheckedIn,
      todayTotalCheckins,
      todayUniqueVisitors: uniqueMembersGroup.length,
      todayDeniedAttempts,
    };
  }

  /**
   * Historical attendance records query
   */
  async getHistory(tenantId: string, query: AttendanceQueryDto) {
    const { page = 1, limit = 20, memberId, branchId, direction, source, startDate, endDate, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (memberId) where.memberId = memberId;
    if (branchId) where.branchId = branchId;
    if (direction) where.direction = direction;
    if (source) where.source = source;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (search) {
      where.member = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { memberCode: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.memberAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              memberCode: true,
              phone: true,
            },
          },
          branch: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, fullName: true } },
          accessDecision: true,
        },
      }),
      this.prisma.memberAttendance.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Attendance correction workflow
   */
  async requestCorrection(tenantId: string, requestedByUserId: string, dto: CreateAttendanceCorrectionDto) {
    return this.prisma.attendanceCorrection.create({
      data: {
        tenantId,
        memberAttendanceId: dto.memberAttendanceId || undefined,
        attendanceSessionId: dto.attendanceSessionId || undefined,
        correctionType: dto.correctionType,
        correctedValue: dto.correctedValue,
        reason: dto.reason,
        requestedByUserId,
        status: CorrectionStatus.PENDING_APPROVAL,
      },
    });
  }

  async approveCorrection(tenantId: string, approvedByUserId: string, correctionId: string) {
    const correction = await this.prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, tenantId },
    });

    if (!correction) throw new NotFoundException('Correction request not found.');
    if (correction.status !== CorrectionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Correction is not pending approval.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Apply corrected values to session if applicable
      if (correction.attendanceSessionId) {
        const val: any = correction.correctedValue;
        await tx.attendanceSession.update({
          where: { id: correction.attendanceSessionId },
          data: {
            checkOutTime: val.checkOutTime ? new Date(val.checkOutTime) : undefined,
            status: val.status || undefined,
            closeReason: 'MANUAL_RECONCILIATION',
          },
        });
      }

      return tx.attendanceCorrection.update({
        where: { id: correctionId },
        data: {
          status: CorrectionStatus.APPROVED,
          approvedByUserId,
        },
      });
    });
  }

  async deleteCorrection(tenantId: string, correctionId: string) {
    const correction = await this.prisma.attendanceCorrection.findFirst({ where: { id: correctionId, tenantId } });
    if (!correction) throw new NotFoundException('Correction request not found.');
    return this.prisma.attendanceCorrection.delete({ where: { id: correctionId } });
  }

  async rejectCorrection(tenantId: string, rejectedByUserId: string, correctionId: string) {
    const correction = await this.prisma.attendanceCorrection.findFirst({ where: { id: correctionId, tenantId } });
    if (!correction) throw new NotFoundException('Correction request not found.');
    if (correction.status !== CorrectionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Correction is not pending approval.');
    }
    return this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: { status: CorrectionStatus.REJECTED, approvedByUserId: rejectedByUserId },
    });
  }

  async listCorrections(tenantId: string) {
    return this.prisma.attendanceCorrection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        session: {
          include: {
            member: { select: { id: true, fullName: true, memberCode: true } },
          },
        },
      },
    });
  }

  /**
   * Policy management
   */
  async getPolicy(tenantId: string, branchId?: string) {
    let policy = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId, branchId: branchId || null },
    });

    if (!policy) {
      // Create initial policy record
      policy = await this.prisma.attendancePolicy.create({
        data: {
          tenantId,
          branchId: branchId || undefined,
          name: branchId ? 'Branch Access Policy' : 'Default Facility Access Policy',
          requireActiveMembership: true,
          allowGracePeriodDays: 0,
          restrictOnOutstandingDues: false,
          maxDuesThresholdInPaise: 0,
          enforceBranchAccess: true,
          allowOffPeakOnly: false,
          duplicateCheckinWindowMinutes: 15,
          autoCheckoutAfterHours: 4,
          allowOwnerOverride: true,
          allowManagerOverride: true,
        },
      });
    }

    return policy;
  }

  async updatePolicy(tenantId: string, branchId: string | undefined, dto: UpdateAttendancePolicyDto) {
    const existing = await this.getPolicy(tenantId, branchId);
    return this.prisma.attendancePolicy.update({
      where: { id: existing.id },
      data: dto,
    });
  }
}
