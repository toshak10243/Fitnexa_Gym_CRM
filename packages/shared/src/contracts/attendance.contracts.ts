import {
  AttendanceSourceType,
  SessionStatus,
  AttendanceCorrectionType,
} from '../constants/index';

export interface CheckInRequestDto {
  memberId: string;
  branchId: string;
  source?: AttendanceSourceType;
  deviceId?: string;
  override?: boolean;
  overrideReason?: string;
}

export interface CheckOutRequestDto {
  memberId: string;
  branchId: string;
  source?: AttendanceSourceType;
  deviceId?: string;
}

export interface AttendanceCorrectionRequestDto {
  memberAttendanceId?: string;
  attendanceSessionId?: string;
  correctionType: AttendanceCorrectionType;
  correctedValue: {
    checkInTime?: string;
    checkOutTime?: string;
    status?: SessionStatus;
  };
  reason: string;
}

export interface UpdateAttendancePolicyDto {
  name?: string;
  requireActiveMembership?: boolean;
  allowGracePeriodDays?: number;
  restrictOnOutstandingDues?: boolean;
  maxDuesThresholdInPaise?: number;
  enforceBranchAccess?: boolean;
  allowOffPeakOnly?: boolean;
  offPeakStartMinutes?: number;
  offPeakEndMinutes?: number;
  duplicateCheckinWindowMinutes?: number;
  autoCheckoutAfterHours?: number;
  allowOwnerOverride?: boolean;
  allowManagerOverride?: boolean;
}

export interface StaffCheckInRequestDto {
  staffId: string;
  branchId: string;
  source?: AttendanceSourceType;
  notes?: string;
}

export interface StaffCheckOutRequestDto {
  staffId: string;
  branchId: string;
}

export interface OccupancySummaryDto {
  currentlyCheckedIn: number;
  todayTotalCheckins: number;
  todayUniqueVisitors: number;
  todayDeniedAttempts: number;
}
