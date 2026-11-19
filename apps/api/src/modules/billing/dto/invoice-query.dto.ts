import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@fitnexa/shared';

export class InvoiceQueryDto {
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

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Search invoice number, member name or phone' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class VoidInvoiceDto {
  @ApiPropertyOptional({ example: 'Member cancelled enrollment before shift start' })
  @IsString()
  @IsOptional()
  voidReason?: string;
}
