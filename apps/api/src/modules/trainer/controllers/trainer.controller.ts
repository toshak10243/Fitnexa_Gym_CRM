import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { TrainerService } from '../services/trainer.service';
import {
  UpsertTrainerProfileDto,
  SetTrainerAvailabilityDto,
  CreateTrainingPackageDto,
  AssignTrainerPackageDto,
  BookTrainingSessionDto,
} from '../dto/trainer.dto';

@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get()
  async getTrainers(@CurrentUser() user: any) {
    return this.trainerService.getTrainers(user.tenantId);
  }

  @Get('packages')
  async getPackages(@CurrentUser() user: any) {
    return this.trainerService.getPackages(user.tenantId);
  }

  @Post('packages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createPackage(
    @CurrentUser() user: any,
    @Body() dto: CreateTrainingPackageDto,
  ) {
    return this.trainerService.createPackage(user.tenantId, dto);
  }

  @Post('assignments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  async assignPackage(
    @CurrentUser() user: any,
    @Body() dto: AssignTrainerPackageDto,
  ) {
    return this.trainerService.assignPackage(user.tenantId, dto);
  }

  @Get('schedule')
  async getSchedule(
    @CurrentUser() user: any,
    @Query('trainerProfileId') trainerProfileId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trainerService.getSchedule(user.tenantId, trainerProfileId, startDate, endDate);
  }

  @Post('sessions')
  async bookSession(
    @CurrentUser() user: any,
    @Body() dto: BookTrainingSessionDto,
  ) {
    return this.trainerService.bookSession(user.tenantId, dto);
  }

  @Patch('sessions/:id/complete')
  async completeSession(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.trainerService.completeSession(user.tenantId, id, notes);
  }

  @Patch('sessions/:id/cancel')
  async cancelSession(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.trainerService.cancelSession(user.tenantId, id, reason);
  }

  @Get(':id')
  async getTrainerById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.trainerService.getTrainerById(user.tenantId, id);
  }

  @Post('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async upsertTrainerProfile(
    @CurrentUser() user: any,
    @Body() dto: UpsertTrainerProfileDto,
  ) {
    return this.trainerService.upsertTrainerProfile(user.tenantId, dto);
  }

  @Put(':id/availability')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.TRAINER)
  async setAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SetTrainerAvailabilityDto,
  ) {
    return this.trainerService.setAvailability(user.tenantId, id, dto);
  }
}
