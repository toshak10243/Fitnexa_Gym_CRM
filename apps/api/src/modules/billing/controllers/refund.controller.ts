import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { RefundService } from '../services/refund.service';
import {
  RequestRefundDto,
  ApproveRefundDto,
  ProcessRefundDto,
} from '../dto/create-renewal.dto';

@ApiTags('Billing: Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post('request')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Submit refund request against payment' })
  async requestRefund(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RequestRefundDto,
  ) {
    return this.refundService.requestRefund(tenantId, userId, dto);
  }

  @Post(':id/approve')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject refund request (Owner only)' })
  async approveRefund(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
  ) {
    return this.refundService.approveRefund(tenantId, id, userId, dto);
  }

  @Post(':id/process')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Record manual payout reference and process refund' })
  async processRefund(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.refundService.processRefund(tenantId, id, userId, dto);
  }

  @Get()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List all refund requests and history' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.refundService.findAll(tenantId);
  }
}
