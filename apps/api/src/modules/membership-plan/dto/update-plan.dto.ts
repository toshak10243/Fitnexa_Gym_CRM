import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDurationType } from '@fitnexa/shared';

export class UpdateMembershipPlanDto {
  @ApiPropertyOptional({ example: 'Annual Pro Fitness (Updated)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'ANNUAL-PRO' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: PlanDurationType })
  @IsEnum(PlanDurationType)
  @IsOptional()
  durationType?: PlanDurationType;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  durationValue?: number;

  @ApiPropertyOptional({ description: 'Price in integer paise' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priceInPaise?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  joiningFeeInPaise?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  taxRateBps?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isTaxInclusive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxFreezeDays?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
