import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { StaffAttendanceService } from '../services/staff-attendance.service';
import { StaffCheckInDto, StaffCheckOutDto } from '../dto/staff-attendance.dto';

@ApiTags('Staff Attendance & Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff-attendance')
export class StaffAttendanceController {
  constructor(private readonly staffAttendanceService: StaffAttendanceService) {}

  @Post('check-in')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Clock in staff duty shift' })
  async checkIn(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('branchId') currentBranchId: string,
    @Body() dto: StaffCheckInDto,
  ) {
    dto.staffId = userId;
    dto.branchId = dto.branchId || currentBranchId;
    return this.staffAttendanceService.checkIn(tenantId, dto);
  }

  @Post('check-out')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Clock out staff duty shift' })
  async checkOut(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('branchId') currentBranchId: string,
    @Body() dto: StaffCheckOutDto,
  ) {
    dto.staffId = userId;
    dto.branchId = dto.branchId || currentBranchId;
    return this.staffAttendanceService.checkOut(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List staff shift attendance logs' })
  async getStaffAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    return this.staffAttendanceService.getStaffAttendance(tenantId, branchId, date);
  }
}
