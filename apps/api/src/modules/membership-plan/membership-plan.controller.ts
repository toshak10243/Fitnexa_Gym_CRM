import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { MembershipPlanService } from './membership-plan.service';
import { CreateMembershipPlanDto } from './dto/create-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';

@ApiTags('Membership Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plans')
export class MembershipPlanController {
  constructor(private readonly planService: MembershipPlanService) {}

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Create a new gym membership plan' })
  @ApiResponse({ status: 201, description: 'Plan successfully created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMembershipPlanDto,
  ) {
    return this.planService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List membership plans with active and branch filters' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PlanQueryDto,
  ) {
    return this.planService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get single membership plan details' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.planService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Update plan details or price (Owner / Branch Manager only)' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipPlanDto,
  ) {
    return this.planService.update(tenantId, id, userId, dto);
  }
}
