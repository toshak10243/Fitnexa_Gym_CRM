import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { ProductService } from './services/product.service';
import { StockService } from './services/stock.service';
import { SupplierService } from './services/supplier.service';

@Module({
  controllers: [InventoryController],
  providers: [ProductService, StockService, SupplierService],
  exports: [ProductService, StockService, SupplierService],
})
export class InventoryModule {}
