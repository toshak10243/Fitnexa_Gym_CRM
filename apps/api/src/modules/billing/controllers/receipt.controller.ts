import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { ReceiptService } from '../services/receipt.service';

@ApiTags('Billing: Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get(':id')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get official payment receipt data' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.receiptService.findById(tenantId, id);
  }
}
