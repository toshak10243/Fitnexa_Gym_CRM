import { MembershipStatus } from '../constants/index';

export interface AssignMembershipDto {
  memberId: string;
  planId: string;
  branchId: string;
  startDate?: string;
  customPriceInPaise?: number;
}

export interface FreezeMembershipDto {
  freezeStartDate: string;
  freezeEndDate: string;
  reason?: string;
}

export interface UnfreezeMembershipDto {
  reason?: string;
}

export interface CancelMembershipDto {
  cancellationReason: string;
}

export interface MemberMembershipQueryDto {
  page?: number;
  limit?: number;
  memberId?: string;
  status?: MembershipStatus;
  branchId?: string;
}
