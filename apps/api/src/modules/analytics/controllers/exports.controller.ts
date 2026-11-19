import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { ReportingService } from '../services/reporting.service';
import { ExportSanitizerService } from '../services/export-sanitizer.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportSanitizerService: ExportSanitizerService,
  ) {}

  @Get('exports/:reportType')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async exportReport(
    @CurrentUser() user: any,
    @Param('reportType') reportType: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const effectiveBranchId = user.role === UserRole.BRANCH_MANAGER ? user.branchId : branchId;

    // Fetch full dataset for export up to 5,000 records
    const reportData = await this.reportingService.generateReport(user.tenantId, reportType, {
      branchId: effectiveBranchId,
      startDate,
      endDate,
      page: 1,
      limit: 5000,
    });

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Fitnexa Client';

    const csvContent = await this.exportSanitizerService.exportToCsv(
      user.tenantId,
      user.userId,
      reportType,
      reportData.records,
      ipAddress,
      userAgent,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `fitnexa-${reportType}-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }
}
