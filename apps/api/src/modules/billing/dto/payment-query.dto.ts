import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType, PaymentStatus } from '@fitnexa/shared';

export class PaymentQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  @IsOptional()
  method?: PaymentMethodType;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class DuesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({
    enum: ['NOT_DUE', 'OVERDUE_1_7', 'OVERDUE_8_30', 'OVERDUE_31_60', 'OVERDUE_60_PLUS'],
  })
  @IsOptional()
  agingBucket?: 'NOT_DUE' | 'OVERDUE_1_7' | 'OVERDUE_8_30' | 'OVERDUE_31_60' | 'OVERDUE_60_PLUS';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class UpdateDueDateDto {
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsString()
  newDueDate: string;

  @ApiPropertyOptional({ example: 'Member requested payday grace extension' })
  @IsString()
  reason: string;
}
