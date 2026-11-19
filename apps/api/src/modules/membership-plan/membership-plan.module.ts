import { Module } from '@nestjs/common';
import { MembershipPlanController } from './membership-plan.controller';
import { MembershipPlanService } from './membership-plan.service';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MembershipPlanController],
  providers: [MembershipPlanService],
  exports: [MembershipPlanService],
})
export class MembershipPlanModule {}
