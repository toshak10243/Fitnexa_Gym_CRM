import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { DashboardService } from '../services/dashboard.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.STAFF,
  )
  async getDashboard(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId =
      user.role === UserRole.BRANCH_MANAGER ||
      user.role === UserRole.FRONT_DESK ||
      user.role === UserRole.STAFF
        ? user.branchId
        : branchId;
    return this.dashboardService.getExecutiveDashboard(user.tenantId, effectiveBranchId);
  }
}
