import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDurationType } from '@fitnexa/shared';

export class CreateMembershipPlanDto {
  @ApiProperty({ example: 'Annual Pro Fitness' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'ANNUAL-PRO' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Unlimited access to gym floor and cardio section' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PlanDurationType, example: PlanDurationType.MONTHS })
  @IsEnum(PlanDurationType)
  durationType: PlanDurationType;

  @ApiProperty({ example: 12, description: 'Duration value in months, days or years' })
  @IsInt()
  @Min(1)
  durationValue: number;

  @ApiProperty({ example: 2400000, description: 'Price in integer paise (e.g. 2400000 = ₹24,000)' })
  @IsInt()
  @Min(0)
  priceInPaise: number;

  @ApiPropertyOptional({ example: 100000, description: 'Joining fee in paise (e.g. 100000 = ₹1,000)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  joiningFeeInPaise?: number = 0;

  @ApiPropertyOptional({ example: 1800, description: 'Tax rate in basis points (1800 = 18.00% GST)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  taxRateBps?: number = 1800;

  @ApiPropertyOptional({ example: false, description: 'Whether the price includes tax' })
  @IsBoolean()
  @IsOptional()
  isTaxInclusive?: boolean = false;

  @ApiPropertyOptional({ example: 30, description: 'Maximum allowable freeze days' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxFreezeDays?: number = 0;

  @ApiPropertyOptional({ description: 'Specific branch ID or null for all branches' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
