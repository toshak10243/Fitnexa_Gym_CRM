import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { ReportingService } from '../services/reporting.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('reports/:reportType')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.STAFF,
  )
  async getReport(
    @CurrentUser() user: any,
    @Param('reportType') reportType: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveBranchId =
      user.role === UserRole.BRANCH_MANAGER ||
      user.role === UserRole.FRONT_DESK ||
      user.role === UserRole.STAFF
        ? user.branchId
        : branchId;

    return this.reportingService.generateReport(user.tenantId, reportType, {
      branchId: effectiveBranchId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
