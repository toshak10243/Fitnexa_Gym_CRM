import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodType } from '@fitnexa/shared';

export class PosCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  unitPriceInPaise: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountInPaise?: number = 0;

  @IsNumber()
  @IsOptional()
  taxRatePercentage?: number;
}

export class PosCheckoutDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsOptional()
  memberId?: string;

  @IsString()
  @IsOptional()
  walkInCustomerName?: string;

  @IsString()
  @IsOptional()
  walkInCustomerPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosCartItemDto)
  items: PosCartItemDto[];

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class PosSaleReturnItemDto {
  @IsString()
  @IsNotEmpty()
  invoiceLineItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class PosSaleReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleReturnItemDto)
  items: PosSaleReturnItemDto[];

  @IsEnum(PaymentMethodType)
  refundMethod: PaymentMethodType;

  @IsString()
  @IsOptional()
  notes?: string;
}
