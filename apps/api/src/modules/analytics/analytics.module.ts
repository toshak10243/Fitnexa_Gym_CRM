import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { DashboardService } from './services/dashboard.service';
import { ReportingService } from './services/reporting.service';
import { ExportSanitizerService } from './services/export-sanitizer.service';
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';
import { ExportsController } from './controllers/exports.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuditLogModule],
  controllers: [DashboardController, ReportsController, ExportsController],
  providers: [DashboardService, ReportingService, ExportSanitizerService],
  exports: [DashboardService, ReportingService, ExportSanitizerService],
})
export class AnalyticsModule {}
