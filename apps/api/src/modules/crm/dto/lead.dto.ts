import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { LeadSource, LeadStage, LeadLostReason } from '@fitnexa/shared';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fitnessGoal?: string;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  trialScheduledAt?: string;
}

export class UpdateLeadStageDto {
  @IsEnum(LeadStage)
  stage: LeadStage;

  @IsEnum(LeadLostReason)
  @IsOptional()
  lostReason?: LeadLostReason;

  @IsString()
  @IsOptional()
  lostNotes?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ScheduleFollowUpDto {
  @IsString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  callType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteFollowUpDto {
  @IsString()
  @IsNotEmpty()
  outcome: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConvertLeadDto {
  @IsString()
  @IsOptional()
  planId?: string;

  @IsString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;
}
