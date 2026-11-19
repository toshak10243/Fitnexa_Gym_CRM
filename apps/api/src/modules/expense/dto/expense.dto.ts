import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ExpensePaymentMethod } from '@fitnexa/shared';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsNotEmpty()
  expenseDate: string; // YYYY-MM-DD

  @IsInt()
  @Min(1)
  amountInPaise: number;

  @IsEnum(ExpensePaymentMethod)
  paymentMethod: ExpensePaymentMethod;

  @IsString()
  @IsNotEmpty()
  payeeName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  receiptDocumentUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveExpenseDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
