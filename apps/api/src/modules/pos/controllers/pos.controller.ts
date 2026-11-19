import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PosService } from '../services/pos.service';
import { PosCheckoutDto, PosSaleReturnDto } from '../dto/pos-checkout.dto';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('checkout')
  async checkout(
    @CurrentUser() user: any,
    @Body() dto: PosCheckoutDto,
  ) {
    return this.posService.checkout(user.tenantId, user.userId, dto);
  }

  @Get('sales')
  async getSales(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posService.getSales(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('sales/:id')
  async getSaleById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.posService.getSaleById(user.tenantId, id);
  }

  @Post('sales/:id/return')
  async processReturn(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PosSaleReturnDto,
  ) {
    return this.posService.processReturn(user.tenantId, id, user.userId, dto);
  }
}
