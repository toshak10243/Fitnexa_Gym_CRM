import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { CashRegisterService } from '../services/cash-register.service';
import {
  OpenRegisterSessionDto,
  CloseRegisterSessionDto,
} from '../dto/create-renewal.dto';

@ApiTags('Billing: Cash Register')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Post('open')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Open shift cash drawer with opening float' })
  async openSession(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: OpenRegisterSessionDto,
  ) {
    return this.cashRegisterService.openSession(tenantId, userId, dto);
  }

  @Get('current')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get active cash session for branch' })
  async getCurrent(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.cashRegisterService.getCurrentSession(tenantId, branchId);
  }

  @Post(':id/close')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Close shift session with physical counted cash and variance' })
  async closeSession(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CloseRegisterSessionDto,
  ) {
    return this.cashRegisterService.closeSession(tenantId, id, userId, dto);
  }

  @Get('sessions')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List recent cash register sessions' })
  async listSessions(
    @CurrentUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.cashRegisterService.listSessions(tenantId, branchId);
  }
}
