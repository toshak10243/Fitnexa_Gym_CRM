import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { JobQueueModule } from './jobs/bullmq.module';
import { HealthModule } from './modules/health/health.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { StaffModule } from './modules/staff/staff.module';
import { MemberModule } from './modules/member/member.module';
import { MembershipPlanModule } from './modules/membership-plan/membership-plan.module';
import { MembershipModule } from './modules/membership/membership.module';
import { MemberImportModule } from './modules/member-import/member-import.module';
import { BillingModule } from './modules/billing/billing.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DeviceModule } from './modules/device/device.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PosModule } from './modules/pos/pos.module';
import { TrainerModule } from './modules/trainer/trainer.module';
import { CrmModule } from './modules/crm/crm.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
    JobQueueModule,
    HealthModule,
    AuditLogModule,
    AuthModule,
    TenantModule,
    StaffModule,
    MemberModule,
    MembershipPlanModule,
    MembershipModule,
    MemberImportModule,
    BillingModule,
    AttendanceModule,
    DeviceModule,
    InventoryModule,
    PosModule,
    TrainerModule,
    CrmModule,
    ExpenseModule,
    NotificationModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
