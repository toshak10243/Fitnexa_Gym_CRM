import { Module } from '@nestjs/common';
import { PosController } from './controllers/pos.controller';
import { PosService } from './services/pos.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
