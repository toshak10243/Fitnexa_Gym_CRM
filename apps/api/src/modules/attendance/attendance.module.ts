import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AccessDecisionService } from './services/access-decision.service';
import { AttendanceService } from './services/attendance.service';
import { StaffAttendanceService } from './services/staff-attendance.service';
import { AttendanceController } from './controllers/attendance.controller';
import { StaffAttendanceController } from './controllers/staff-attendance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController, StaffAttendanceController],
  providers: [AccessDecisionService, AttendanceService, StaffAttendanceService],
  exports: [AccessDecisionService, AttendanceService, StaffAttendanceService],
})
export class AttendanceModule {}
