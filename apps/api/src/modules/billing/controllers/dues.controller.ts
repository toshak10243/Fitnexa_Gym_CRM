import {
  Controller,
  Get,
  Patch,
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
import { DuesService } from '../services/dues.service';
import { DuesQueryDto, UpdateDueDateDto } from '../dto/payment-query.dto';

@ApiTags('Billing: Dues & Aging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/dues')
export class DuesController {
  constructor(private readonly duesService: DuesService) {}

  @Get()
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get outstanding dues summary and aging distribution' })
  async getDuesSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: DuesQueryDto,
  ) {
    return this.duesService.getDuesSummary(tenantId, query);
  }

  @Patch(':invoiceId/due-date')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Extend due date with reason (Owner / Manager only)' })
  async updateDueDate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateDueDateDto,
  ) {
    return this.duesService.updateDueDate(tenantId, invoiceId, userId, dto);
  }
}
