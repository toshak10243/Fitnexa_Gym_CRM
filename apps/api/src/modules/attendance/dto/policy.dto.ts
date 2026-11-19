import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttendancePolicyDto {
  @ApiPropertyOptional({ example: 'Main Facility Access Policy' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  requireActiveMembership?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  allowGracePeriodDays?: number;

  @ApiPropertyOptional({ default: false, description: 'Whether unpaid invoices block gym turnstile' })
  @IsBoolean()
  @IsOptional()
  restrictOnOutstandingDues?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Maximum tolerable unpaid dues in paise' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDuesThresholdInPaise?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enforceBranchAccess?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  allowOffPeakOnly?: boolean;

  @ApiPropertyOptional({ example: 600, description: 'Start time in minutes from midnight (e.g. 10:00 AM)' })
  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  offPeakStartMinutes?: number;

  @ApiPropertyOptional({ example: 1020, description: 'End time in minutes from midnight (e.g. 5:00 PM)' })
  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  offPeakEndMinutes?: number;

  @ApiPropertyOptional({ default: 15, description: 'Window in minutes to ignore duplicate gate taps' })
  @IsInt()
  @Min(1)
  @IsOptional()
  duplicateCheckinWindowMinutes?: number;

  @ApiPropertyOptional({ default: 4, description: 'Auto checkout period for stale visits in hours' })
  @IsInt()
  @Min(1)
  @IsOptional()
  autoCheckoutAfterHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowOwnerOverride?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowManagerOverride?: boolean;
}
