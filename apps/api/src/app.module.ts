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
  ],
})
export class AppModule {}
