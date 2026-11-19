import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { DeviceService } from '../services/device.service';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { MapDeviceMemberDto } from '../dto/map-member.dto';

@ApiTags('Biometric & Access Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register a new biometric terminal or gate' })
  @ApiResponse({ status: 201, description: 'Device registered and assigned secret token returned' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.deviceService.create(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List registered devices with heartbeat telemetry' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.deviceService.findAll(tenantId, branchId);
  }

  @Get('unmapped-events')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Inspect events with unmapped hardware enrollment IDs' })
  async getUnmappedEvents(
    @CurrentUser('tenantId') tenantId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.deviceService.getUnmappedEvents(tenantId, deviceId);
  }

  @Get(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get device details by ID' })
  async findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update device settings' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceService.update(tenantId, id, dto);
  }

  @Post(':id/test-connection')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Execute connection handshake test on device' })
  async testConnection(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.testConnection(tenantId, id);
  }

  @Post(':id/mappings')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Map member to terminal enrollment ID' })
  async mapMember(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: MapDeviceMemberDto,
  ) {
    return this.deviceService.mapMember(tenantId, id, dto);
  }

  @Delete(':id/mappings/:mappingId')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove member terminal mapping' })
  async unmapMember(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Param('mappingId') mappingId: string,
  ) {
    return this.deviceService.unmapMember(tenantId, id, mappingId);
  }

  @Get(':id/mappings')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List all member mappings for this device' })
  async getMappings(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.deviceService.getMappings(tenantId, id);
  }
}
