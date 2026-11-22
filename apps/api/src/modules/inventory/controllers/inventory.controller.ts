import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
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
  CreateStockMovementDto,
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

  @Put('categories/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  updateCategory(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateProductCategoryDto) { return this.productService.updateCategory(user.tenantId, id, dto); }

  @Delete('categories/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  deleteCategory(@CurrentUser() user: any, @Param('id') id: string) { return this.productService.deleteCategory(user.tenantId, id); }

  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------

  @Post('products/upload-photo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'products');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/i.test(file.mimetype)),
  }))
  uploadProductPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Upload a JPG, PNG, or WebP product image.');
    return { photoUrl: `/uploads/products/${file.filename}` };
  }

  @Post('categories/upload-image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @UseInterceptors(FileInterceptor('image', { storage: diskStorage({ destination: (_r, _f, cb) => { const dir = path.join(process.cwd(), 'uploads', 'categories'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); cb(null, dir); }, filename: (_r, f, cb) => cb(null, `category-${Date.now()}${path.extname(f.originalname).toLowerCase()}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_r, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/i.test(f.mimetype)) }))
  uploadCategoryImage(@UploadedFile() file: Express.Multer.File) { if (!file) throw new BadRequestException('Upload a JPG, PNG, or WebP category image.'); return { imageUrl: `/uploads/categories/${file.filename}` }; }

  @Get('products')
  async getProducts(
    @CurrentUser() user: any,
    @Query() query: ProductQueryDto,
  ) {
    return this.productService.getProducts(user.tenantId, query);
  }

  @Public()
  @Get('public/products/:id')
  async getPublicProduct(@Param('id') id: string) {
    return this.productService.getPublicProductById(id);
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

  @Delete('products/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async deleteProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productService.deleteProduct(user.tenantId, id);
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

  @Post('stock-movements/manual')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async recordManualStockMovement(@CurrentUser() user: any, @Body() dto: CreateStockMovementDto) {
    return this.stockService.recordManualStockMovement(user.tenantId, user.userId, dto);
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

  @Delete('purchases/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async deletePurchaseOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.supplierService.deletePurchaseOrder(user.tenantId, id);
  }
}
