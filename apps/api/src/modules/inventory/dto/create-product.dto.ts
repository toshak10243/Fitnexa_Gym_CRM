import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUnit } from '@fitnexa/shared';

export class CreateProductCategoryDto {
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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @IsInt()
  @Min(0)
  costPriceInPaise: number;

  @IsInt()
  @Min(0)
  sellingPriceInPaise: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  taxRatePercentage?: number;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderThreshold?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @IsInt()
  @Min(0)
  @IsOptional()
  costPriceInPaise?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sellingPriceInPaise?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  taxRatePercentage?: number;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderThreshold?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ProductQueryDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  isLowStock?: boolean;

  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
