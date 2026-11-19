import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '@fitnexa/shared';

export class PaymentAllocationInputDto {
  @ApiProperty({ example: 'invoice-uuid-123' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 500000, description: 'Amount allocated in integer paise (₹5,000)' })
  @IsInt()
  @Min(1)
  amountInPaise: number;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'branch-uuid-456' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 500000, description: 'Collected amount in integer paise (e.g. 500000 = ₹5,000)' })
  @IsInt()
  @Min(1)
  amountInPaise: number;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.UPI })
  @IsEnum(PaymentMethodType)
  method: PaymentMethodType;

  @ApiPropertyOptional({ example: 'UPI-UTR-9876543210' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'Paid via GPay at front counter' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [PaymentAllocationInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationInputDto)
  @IsOptional()
  allocations?: PaymentAllocationInputDto[];
}
