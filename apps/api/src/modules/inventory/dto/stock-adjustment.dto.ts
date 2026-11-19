import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateStockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsInt()
  @Min(0)
  physicalQuantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateStockLocationDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
