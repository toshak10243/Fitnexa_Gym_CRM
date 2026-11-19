import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { DeviceService } from './services/device.service';
import { DeviceEventService } from './services/device-event.service';
import { DeviceController } from './controllers/device.controller';
import { DeviceIngestController } from './controllers/device-ingest.controller';

@Module({
  imports: [PrismaModule, AttendanceModule],
  controllers: [DeviceController, DeviceIngestController],
  providers: [DeviceService, DeviceEventService],
  exports: [DeviceService, DeviceEventService],
})
export class DeviceModule {}
