import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import {
  CurrentTenant,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, UserStatus } from '@fitnexa/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Staff Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  private extractClientMetadata(req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-ip';
    const userAgent = req.get('user-agent') || 'unknown-client';
    return { ipAddress, userAgent };
  }

  @Get()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List staff members in gym organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiResponse({ status: 200, description: 'Paginated list of staff members.' })
  async getStaff(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.staffService.findStaffByTenant(
      tenantId,
      pageNum,
      limitNum,
      search,
      role,
      status,
    );
  }

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff member account' })
  @ApiResponse({ status: 201, description: 'Staff account created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async createStaff(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateStaffDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.staffService.createStaff(tenantId, userId, dto, ipAddress, userAgent);
  }

  @Get(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get staff member profile' })
  @ApiResponse({ status: 200, description: 'Staff member profile.' })
  @ApiResponse({ status: 404, description: 'Staff member not found.' })
  async getStaffById(
    @CurrentTenant() tenantId: string,
    @Param('id') staffId: string,
  ) {
    return this.staffService.getStaffById(tenantId, staffId);
  }

  @Patch(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff member details and role' })
  @ApiResponse({ status: 200, description: 'Staff updated successfully.' })
  async updateStaff(
    @CurrentTenant() tenantId: string,
    @Param('id') staffId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.staffService.updateStaff(tenantId, staffId, userId, dto, ipAddress, userAgent);
  }

  @Patch(':id/status')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change staff member status (Active, Suspended, Deactivated)' })
  @ApiResponse({ status: 200, description: 'Staff status updated.' })
  async updateStaffStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') staffId: string,
    @CurrentUser('userId') userId: string,
    @Body('status') status: UserStatus,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.staffService.updateStaffStatus(
      tenantId,
      staffId,
      userId,
      status,
      ipAddress,
      userAgent,
    );
  }
}
