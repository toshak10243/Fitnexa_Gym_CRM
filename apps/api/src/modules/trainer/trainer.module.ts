import { Module } from '@nestjs/common';
import { TrainerController } from './controllers/trainer.controller';
import { TrainerService } from './services/trainer.service';

@Module({
  controllers: [TrainerController],
  providers: [TrainerService],
  exports: [TrainerService],
})
export class TrainerModule {}
