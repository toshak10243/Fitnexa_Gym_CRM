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
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceQueryDto, VoidInvoiceDto } from '../dto/invoice-query.dto';

@ApiTags('Billing: Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Create and issue a tax invoice' })
  @ApiResponse({ status: 201, description: 'Invoice successfully generated' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List invoices with status and member search' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoiceService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get single invoice with line items and allocations' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoiceService.findById(tenantId, id);
  }

  @Post(':id/email')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  async email(@CurrentUser('tenantId') tenantId: string, @CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.invoiceService.emailInvoice(tenantId, id, userId);
  }

  @Post(':id/void')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Void an unpaid invoice with rationale' })
  async void(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.invoiceService.void(tenantId, id, userId, dto);
  }
}
