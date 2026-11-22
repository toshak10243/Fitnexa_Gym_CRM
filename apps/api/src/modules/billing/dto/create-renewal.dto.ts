import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '@fitnexa/shared';

export class CreateRenewalDto {
  @IsOptional()
  @IsIn(['FULL', 'INSTALLMENT', 'PAY_LATER'])
  settlementMode?: 'FULL' | 'INSTALLMENT' | 'PAY_LATER';
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ example: 'membership-uuid-456' })
  @IsString()
  @IsOptional()
  currentMembershipId?: string;

  @ApiProperty({ example: 'plan-uuid-789' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Custom renewal price in paise if discounted' })
  @IsInt()
  @Min(0)
  @IsOptional()
  customPriceInPaise?: number;

  @ApiPropertyOptional({ description: 'Immediate down payment in paise' })
  @IsInt()
  @Min(0)
  @IsOptional()
  downPaymentInPaise?: number = 0;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  @IsOptional()
  downPaymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: 'UPI-REF-9988' })
  @IsString()
  @IsOptional()
  downPaymentReference?: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class RequestRefundDto {
  @ApiProperty({ example: 'payment-uuid-123' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({ example: 250000, description: 'Refund amount in integer paise (₹2,500)' })
  @IsInt()
  @Min(1)
  amountInPaise: number;

  @ApiProperty({ example: 'Double charged due to cashier card slip machine error' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ApproveRefundDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ example: 'Approved by Club General Manager' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ProcessRefundDto {
  @ApiProperty({ example: 'IMPS/UTR/998877665544' })
  @IsString()
  @IsNotEmpty()
  payoutReference: string;
}

export class OpenRegisterSessionDto {
  @ApiProperty({ example: 'branch-uuid-123' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 500000, description: 'Opening cash float in paise (₹5,000)' })
  @IsInt()
  @Min(0)
  openingFloatInPaise: number;

  @ApiPropertyOptional({ example: 'Morning Shift A' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CloseRegisterSessionDto {
  @ApiProperty({ example: 1250000, description: 'Physical cash counted at shift end in paise (₹12,500)' })
  @IsInt()
  @Min(0)
  actualClosingPaise: number;

  @ApiPropertyOptional({ example: 'All cash verified with front manager' })
  @IsString()
  @IsOptional()
  notes?: string;
}
