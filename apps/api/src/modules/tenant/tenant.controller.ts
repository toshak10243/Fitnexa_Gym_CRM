import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import {
  CurrentTenant,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@fitnexa/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Gym Tenant & Branches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private extractClientMetadata(req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-ip';
    const userAgent = req.get('user-agent') || 'unknown-client';
    return { ipAddress, userAgent };
  }

  @Get('profile')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current gym profile and facility settings' })
  @ApiResponse({ status: 200, description: 'Gym profile retrieved successfully.' })
  async getProfile(@CurrentTenant() tenantId: string) {
    return this.tenantService.getProfile(tenantId);
  }

  @Patch('profile')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gym enterprise details (GSTIN, Address, Contacts)' })
  @ApiResponse({ status: 200, description: 'Gym profile updated successfully.' })
  async updateProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.updateProfile(tenantId, userId, dto, ipAddress, userAgent);
  }

  @Get('branches')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List all facilities / branches for the gym' })
  @ApiResponse({ status: 200, description: 'List of branches.' })
  async getBranches(@CurrentTenant() tenantId: string) {
    return this.tenantService.getBranches(tenantId);
  }

  @Post('branches')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new gym facility / branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully.' })
  @ApiResponse({ status: 409, description: 'Branch code already in use.' })
  async createBranch(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.createBranch(tenantId, userId, dto, ipAddress, userAgent);
  }

  @Patch('branches/:id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gym branch details' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully.' })
  async updateBranch(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.updateBranch(tenantId, branchId, userId, dto, ipAddress, userAgent);
  }
}
