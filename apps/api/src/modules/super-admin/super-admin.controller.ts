import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import {
  CreateTenantClientDto,
  UpdateTenantSubscriptionDto,
} from './dto/create-tenant-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';

@ApiTags('Super Admin SaaS Platform')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get SaaS high-level platform business metrics' })
  async getStats() {
    return this.superAdminService.getDashboardStats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all gym client tenants with plans and owner details' })
  async getAllTenants() {
    return this.superAdminService.getAllTenants();
  }

  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new gym client enterprise with owner credentials & plan' })
  async createTenant(
    @CurrentUser('userId') adminUserId: string,
    @Body() dto: CreateTenantClientDto,
  ) {
    return this.superAdminService.createTenantClient(dto, adminUserId);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update gym client subscription, expiry, and module flags' })
  async updateTenant(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') tenantId: string,
    @Body() dto: UpdateTenantSubscriptionDto,
  ) {
    return this.superAdminService.updateTenantSubscription(tenantId, dto, adminUserId);
  }

  @Post('tenants/:id/reset-password')
  @ApiOperation({ summary: 'Reset gym owner password and return temporary credentials' })
  async resetPassword(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') tenantId: string,
  ) {
    return this.superAdminService.resetClientPassword(tenantId, adminUserId);
  }

  @Post('impersonate/:tenantId')
  @ApiOperation({ summary: 'Login as client gym owner without password (troubleshooting)' })
  async impersonate(
    @CurrentUser('userId') adminUserId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.superAdminService.impersonateTenant(tenantId, adminUserId);
  }
}
