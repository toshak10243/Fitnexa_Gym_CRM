import { Module } from '@nestjs/common';
import { MemberImportController } from './member-import.controller';
import { MemberImportService } from './member-import.service';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [PrismaModule, AuditLogModule, MemberModule],
  controllers: [MemberImportController],
  providers: [MemberImportService],
  exports: [MemberImportService],
})
export class MemberImportModule {}
