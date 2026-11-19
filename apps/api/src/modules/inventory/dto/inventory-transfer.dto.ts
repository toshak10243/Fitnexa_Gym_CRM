import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryTransferItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateInventoryTransferDto {
  @IsString()
  @IsNotEmpty()
  sourceBranchId: string;

  @IsString()
  @IsNotEmpty()
  sourceLocationId: string;

  @IsString()
  @IsNotEmpty()
  destBranchId: string;

  @IsString()
  @IsNotEmpty()
  destLocationId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryTransferItemDto)
  items: InventoryTransferItemDto[];
}
