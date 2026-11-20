import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { SaaSSubscriptionPlan } from '@fitnexa/shared';

export class CreateTenantClientDto {
  @ApiProperty({ example: 'Cult Fitness Club' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'cultfit' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'Vikramaditya Rathore' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'owner@cultfit.in' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Owner phone must be a 10-digit Indian mobile number' })
  ownerPhone: string;

  @ApiProperty({ enum: SaaSSubscriptionPlan, example: SaaSSubscriptionPlan.MONTH_1 })
  @IsEnum(SaaSSubscriptionPlan)
  plan: SaaSSubscriptionPlan;

  @ApiPropertyOptional({ example: 'PAID' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'UPI' })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional({ example: 'UPI-REF-992102931' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: ['MEMBERS', 'BILLING', 'ATTENDANCE', 'DEVICES', 'INVENTORY', 'POS', 'CRM', 'TRAINERS', 'EXPENSES', 'NOTIFICATIONS', 'ANALYTICS'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledModules?: string[];

  @ApiPropertyOptional({ example: 'Indiranagar' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '560038' })
  @IsOptional()
  @IsString()
  pincode?: string;
}

export class UpdateTenantSubscriptionDto {
  @ApiPropertyOptional({ enum: SaaSSubscriptionPlan })
  @IsOptional()
  @IsEnum(SaaSSubscriptionPlan)
  plan?: SaaSSubscriptionPlan;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'PAID' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'UPI-9821873' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsString()
  planExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];
}
