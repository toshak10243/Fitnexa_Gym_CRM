import {
  Controller,
  Get,
  Post,
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
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';

@ApiTags('Billing: Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Record payment transaction and allocate to invoice(s)' })
  @ApiResponse({ status: 201, description: 'Payment recorded and receipt generated' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List payments with method and date filters' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get single payment details with allocations' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentService.findById(tenantId, id);
  }
}
