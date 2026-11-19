import { PlanDurationType } from '../constants/index';

export interface CreateMembershipPlanDto {
  name: string;
  code?: string;
  description?: string;
  durationType: PlanDurationType;
  durationValue: number;
  priceInPaise: number;
  joiningFeeInPaise?: number;
  taxRateBps?: number;
  isTaxInclusive?: boolean;
  maxFreezeDays?: number;
  branchId?: string;
  isActive?: boolean;
}

export interface UpdateMembershipPlanDto {
  name?: string;
  code?: string;
  description?: string;
  durationType?: PlanDurationType;
  durationValue?: number;
  priceInPaise?: number;
  joiningFeeInPaise?: number;
  taxRateBps?: number;
  isTaxInclusive?: boolean;
  maxFreezeDays?: number;
  branchId?: string;
  isActive?: boolean;
}

export interface PlanQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  branchId?: string;
}
