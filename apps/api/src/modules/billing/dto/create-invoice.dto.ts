import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceLineItemDto {
  @ApiProperty({ example: 'Annual Gym Membership Plan' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiProperty({ example: 1800000, description: 'Unit price in integer paise (₹18,000)' })
  @IsInt()
  @Min(0)
  unitPriceInPaise: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  discountInPaise?: number = 0;

  @ApiPropertyOptional({ example: 1800, default: 1800, description: 'GST rate in basis points (18%)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  taxRateBps?: number = 1800;

  @ApiProperty({ example: 'PLAN', description: 'PLAN, JOINING_FEE, PERSONAL_TRAINING, SERVICE, OTHER' })
  @IsString()
  @IsNotEmpty()
  itemType: string;

  @ApiPropertyOptional({ description: 'Referenced planId or serviceId' })
  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'branch-uuid-456' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: 'membership-uuid-789' })
  @IsString()
  @IsOptional()
  membershipId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsString()
  @IsOptional()
  invoiceDate?: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ type: [CreateInvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  lineItems: CreateInvoiceLineItemDto[];

  @ApiPropertyOptional({ example: 'First-time student discount applied' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Fees non-refundable. Locker usage subject to rules.' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ default: false, description: 'Whether prices include GST' })
  @IsBoolean()
  @IsOptional()
  isTaxInclusive?: boolean = false;
}
