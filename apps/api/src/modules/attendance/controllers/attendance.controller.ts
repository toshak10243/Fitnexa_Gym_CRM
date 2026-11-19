import {
  Controller,
  Get,
  Post,
  Put,
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
import { AttendanceService } from '../services/attendance.service';
import { CheckInDto, CheckOutDto } from '../dto/check-in.dto';
import { AttendanceQueryDto, ActiveSessionQueryDto } from '../dto/attendance-query.dto';
import { CreateAttendanceCorrectionDto } from '../dto/correction.dto';
import { UpdateAttendancePolicyDto } from '../dto/policy.dto';

@ApiTags('Attendance & Access Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Check in member with real-time policy evaluation' })
  @ApiResponse({ status: 201, description: 'Check-in granted and active session created' })
  @ApiResponse({ status: 403, description: 'Entry denied by access policy' })
  @ApiResponse({ status: 409, description: 'Duplicate check-in or already active' })
  async checkIn(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(tenantId, userId, role, dto);
  }

  @Post('check-out')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Check out member and close active session' })
  async checkOut(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(tenantId, userId, dto);
  }

  @Get('active')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List members currently checked in inside the facility' })
  async getActiveSessions(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: ActiveSessionQueryDto,
  ) {
    return this.attendanceService.getActiveSessions(tenantId, query);
  }

  @Get('occupancy')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get live occupancy KPIs and today visitor counts' })
  async getOccupancy(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.attendanceService.getOccupancySummary(tenantId, branchId);
  }

  @Get('history')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Query historical attendance records' })
  async getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getHistory(tenantId, query);
  }

  @Post('corrections')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Request retrospective attendance fix' })
  async requestCorrection(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAttendanceCorrectionDto,
  ) {
    return this.attendanceService.requestCorrection(tenantId, userId, dto);
  }

  @Post('corrections/:id/approve')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve attendance correction' })
  async approveCorrection(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.attendanceService.approveCorrection(tenantId, userId, id);
  }

  @Get('corrections')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List attendance correction requests' })
  async listCorrections(@CurrentUser('tenantId') tenantId: string) {
    return this.attendanceService.listCorrections(tenantId);
  }

  @Get('policy')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get facility attendance and access policy' })
  async getPolicy(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.attendanceService.getPolicy(tenantId, branchId);
  }

  @Put('policy')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update facility attendance access policy' })
  async updatePolicy(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId: string | undefined,
    @Body() dto: UpdateAttendancePolicyDto,
  ) {
    return this.attendanceService.updatePolicy(tenantId, branchId, dto);
  }
}
