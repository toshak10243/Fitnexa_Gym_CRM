import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, AuditLogModule, SuperAdminModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
