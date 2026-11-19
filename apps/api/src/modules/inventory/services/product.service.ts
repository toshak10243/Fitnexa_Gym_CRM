import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  CreateProductCategoryDto,
} from '../dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, dto: CreateProductCategoryDto) {
    const existing = await this.prisma.productCategory.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Category code '${dto.code}' already exists in your gym.`);
    }

    return this.prisma.productCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
      },
    });
  }

  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const sku = dto.sku.trim().toUpperCase();

    // 1. Verify unique SKU per tenant
    const existingSku = await this.prisma.product.findUnique({
      where: { tenantId_sku: { tenantId, sku } },
    });
    if (existingSku) {
      throw new ConflictException(`Product SKU '${sku}' is already registered in your organization.`);
    }

    // 2. Verify Category exists
    const category = await this.prisma.productCategory.findFirst({
      where: { id: dto.categoryId, tenantId },
    });
    if (!category) {
      throw new NotFoundException(`Product category with ID '${dto.categoryId}' not found.`);
    }

    return this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        sku,
        barcode: dto.barcode?.trim() || null,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        unit: dto.unit || 'PIECES',
        costPriceInPaise: dto.costPriceInPaise,
        sellingPriceInPaise: dto.sellingPriceInPaise,
        taxRatePercentage: dto.taxRatePercentage !== undefined ? dto.taxRatePercentage : 18.0,
        hsnCode: dto.hsnCode?.trim() || null,
        reorderThreshold: dto.reorderThreshold !== undefined ? dto.reorderThreshold : 5,
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  async updateProduct(tenantId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: dto.categoryId,
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        unit: dto.unit,
        costPriceInPaise: dto.costPriceInPaise,
        sellingPriceInPaise: dto.sellingPriceInPaise,
        taxRatePercentage: dto.taxRatePercentage,
        hsnCode: dto.hsnCode?.trim(),
        reorderThreshold: dto.reorderThreshold,
        isActive: dto.isActive,
      },
      include: {
        category: true,
      },
    });
  }

  async getProductById(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        category: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    // Calculate current aggregate stock across all locations
    const stockAgg = await this.prisma.stockMovement.aggregate({
      where: { tenantId, productId },
      _sum: { quantityDelta: true },
    });
    const currentStock = stockAgg._sum.quantityDelta || 0;

    return {
      ...product,
      currentStock,
      isLowStock: currentStock <= product.reorderThreshold,
    };
  }

  async getProducts(tenantId: string, query: ProductQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Attach current stock level to each item
    const productIds = items.map((p) => p.id);
    const stockMovements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, productId: { in: productIds } },
      _sum: { quantityDelta: true },
    });

    const stockMap = new Map<string, number>();
    for (const sm of stockMovements) {
      stockMap.set(sm.productId, sm._sum.quantityDelta || 0);
    }

    let enrichedItems = items.map((p) => {
      const currentStock = stockMap.get(p.id) || 0;
      return {
        ...p,
        currentStock,
        isLowStock: currentStock <= p.reorderThreshold,
      };
    });

    if (query.isLowStock) {
      enrichedItems = enrichedItems.filter((p) => p.isLowStock);
    }

    return {
      items: enrichedItems,
      total,
      page,
      limit,
    };
  }
}
