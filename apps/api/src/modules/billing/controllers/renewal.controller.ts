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
import { RenewalService } from '../services/renewal.service';
import { CreateRenewalDto } from '../dto/create-renewal.dto';

@ApiTags('Billing: Renewals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/renewals')
export class RenewalController {
  constructor(private readonly renewalService: RenewalService) {}

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Initiate membership renewal with invoice and optional down payment' })
  async renew(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRenewalDto,
  ) {
    return this.renewalService.renew(tenantId, userId, dto);
  }

  @Get('expiring')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get memberships expiring within N days' })
  async getExpiring(
    @CurrentUser('tenantId') tenantId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.renewalService.getExpiringMemberships(tenantId, daysAhead ? Number(daysAhead) : 30);
  }
}
