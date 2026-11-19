import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { ProductService } from '../services/product.service';
import { StockService } from '../services/stock.service';
import { SupplierService } from '../services/supplier.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  CreateProductCategoryDto,
} from '../dto/create-product.dto';
import {
  CreateStockAdjustmentDto,
  CreateStockLocationDto,
} from '../dto/stock-adjustment.dto';
import { CreateInventoryTransferDto } from '../dto/inventory-transfer.dto';
import { CreateSupplierDto } from '../dto/supplier.dto';
import {
  CreatePurchaseOrderDto,
  ReceiveGoodsDto,
} from '../dto/purchase-order.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly productService: ProductService,
    private readonly stockService: StockService,
    private readonly supplierService: SupplierService,
  ) {}

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------

  @Get('categories')
  async getCategories(@CurrentUser() user: any) {
    return this.productService.getCategories(user.tenantId);
  }

  @Post('categories')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createCategory(
    @CurrentUser() user: any,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.productService.createCategory(user.tenantId, dto);
  }

  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------

  @Get('products')
  async getProducts(
    @CurrentUser() user: any,
    @Query() query: ProductQueryDto,
  ) {
    return this.productService.getProducts(user.tenantId, query);
  }

  @Post('products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createProduct(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.createProduct(user.tenantId, dto);
  }

  @Get('products/:id')
  async getProductById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.productService.getProductById(user.tenantId, id);
  }

  @Put('products/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async updateProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(user.tenantId, id, dto);
  }

  // --------------------------------------------------------------------------
  // Stock Locations & Movements
  // --------------------------------------------------------------------------

  @Get('locations')
  async getLocations(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    return this.stockService.getLocations(user.tenantId, branchId || user.branchId);
  }

  @Post('locations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createLocation(
    @CurrentUser() user: any,
    @Body() dto: CreateStockLocationDto,
  ) {
    return this.stockService.createLocation(user.tenantId, dto);
  }

  @Get('movements')
  async getMovements(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
  ) {
    return this.stockService.getMovements(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      productId,
    );
  }

  @Get('valuation')
  async getStockValuation(@CurrentUser() user: any) {
    return this.stockService.getStockValuation(user.tenantId);
  }

  @Post('adjustments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async recordStockAdjustment(
    @CurrentUser() user: any,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.stockService.recordStockAdjustment(user.tenantId, user.userId, dto);
  }

  @Post('transfers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createTransfer(
    @CurrentUser() user: any,
    @Body() dto: CreateInventoryTransferDto,
  ) {
    return this.stockService.createTransfer(user.tenantId, user.userId, dto);
  }

  // --------------------------------------------------------------------------
  // Suppliers & Purchasing
  // --------------------------------------------------------------------------

  @Get('suppliers')
  async getSuppliers(@CurrentUser() user: any) {
    return this.supplierService.getSuppliers(user.tenantId);
  }

  @Post('suppliers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createSupplier(
    @CurrentUser() user: any,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.supplierService.createSupplier(user.tenantId, dto);
  }

  @Get('purchases')
  async getPurchaseOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supplierService.getPurchaseOrders(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('purchases')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createPurchaseOrder(
    @CurrentUser() user: any,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.supplierService.createPurchaseOrder(user.tenantId, user.userId, dto);
  }

  @Post('purchases/:id/receive')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async receiveGoods(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReceiveGoodsDto,
  ) {
    return this.supplierService.receiveGoods(user.tenantId, id, user.userId, dto);
  }
}
