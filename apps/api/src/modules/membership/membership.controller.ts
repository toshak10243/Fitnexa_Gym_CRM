import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { MembershipService } from './membership.service';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { FreezeMembershipDto } from './dto/freeze-membership.dto';
import { UnfreezeMembershipDto } from './dto/unfreeze-membership.dto';
import { CancelMembershipDto } from './dto/cancel-membership.dto';

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('assign')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Assign a membership plan to a member' })
  @ApiResponse({ status: 201, description: 'Membership assigned' })
  async assign(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AssignMembershipDto,
  ) {
    return this.membershipService.assign(tenantId, userId, dto);
  }

  @Post(':id/freeze')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Freeze an active membership' })
  async freeze(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: FreezeMembershipDto,
  ) {
    return this.membershipService.freeze(tenantId, id, userId, dto);
  }

  @Post(':id/unfreeze')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Unfreeze a membership and extend end date' })
  async unfreeze(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UnfreezeMembershipDto,
  ) {
    return this.membershipService.unfreeze(tenantId, id, userId, dto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Cancel a membership' })
  async cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelMembershipDto,
  ) {
    return this.membershipService.cancel(tenantId, id, userId, dto);
  }
}
