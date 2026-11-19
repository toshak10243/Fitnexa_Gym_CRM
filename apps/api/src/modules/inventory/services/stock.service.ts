import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { StockMovementType, InventoryTransferStatus } from '@fitnexa/shared';
import {
  CreateStockAdjustmentDto,
  CreateStockLocationDto,
} from '../dto/stock-adjustment.dto';
import { CreateInventoryTransferDto } from '../dto/inventory-transfer.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Stock Locations
  // --------------------------------------------------------------------------

  async getLocations(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) where.branchId = branchId;
    return this.prisma.stockLocation.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createLocation(tenantId: string, dto: CreateStockLocationDto) {
    return this.prisma.stockLocation.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        isActive: true,
      },
    });
  }

  async getOrCreateDefaultLocation(tenantId: string, branchId: string) {
    let loc = await this.prisma.stockLocation.findFirst({
      where: { tenantId, branchId, isDefault: true },
    });

    if (!loc) {
      loc = await this.prisma.stockLocation.findFirst({
        where: { tenantId, branchId },
      });
    }

    if (!loc) {
      loc = await this.prisma.stockLocation.create({
        data: {
          tenantId,
          branchId,
          name: 'Main Storage Shelf',
          code: 'MAIN-SHELF',
          isDefault: true,
          isActive: true,
        },
      });
    }

    return loc;
  }

  // --------------------------------------------------------------------------
  // Stock Balances & Movements
  // --------------------------------------------------------------------------

  async getProductStock(tenantId: string, productId: string, locationId?: string) {
    const where: any = { tenantId, productId };
    if (locationId) where.locationId = locationId;

    const agg = await this.prisma.stockMovement.aggregate({
      where,
      _sum: { quantityDelta: true },
    });

    return agg._sum.quantityDelta || 0;
  }

  async recordMovement(params: {
    tenantId: string;
    branchId: string;
    productId: string;
    locationId: string;
    movementType: StockMovementType;
    quantityDelta: number;
    unitCostInPaise: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    recordedByUserId?: string;
  }) {
    // If movement is deducting stock (negative quantityDelta), verify balance unless write-off
    if (params.quantityDelta < 0) {
      const current = await this.getProductStock(
        params.tenantId,
        params.productId,
        params.locationId,
      );
      if (current + params.quantityDelta < 0) {
        throw new BadRequestException(
          `Insufficient stock at selected location. Available: ${current}, requested deduction: ${Math.abs(
            params.quantityDelta,
          )}.`,
        );
      }
    }

    return this.prisma.stockMovement.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        productId: params.productId,
        locationId: params.locationId,
        movementType: params.movementType,
        quantityDelta: params.quantityDelta,
        unitCostInPaise: params.unitCostInPaise,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        notes: params.notes,
        recordedByUserId: params.recordedByUserId,
      },
    });
  }

  async recordOpeningStock(
    tenantId: string,
    branchId: string,
    productId: string,
    quantity: number,
    locationId?: string,
    recordedByUserId?: string,
  ) {
    const loc = locationId
      ? await this.prisma.stockLocation.findFirst({ where: { id: locationId, tenantId } })
      : await this.getOrCreateDefaultLocation(tenantId, branchId);

    if (!loc) throw new NotFoundException('Stock location not found');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.recordMovement({
      tenantId,
      branchId,
      productId,
      locationId: loc.id,
      movementType: StockMovementType.OPENING_STOCK,
      quantityDelta: quantity,
      unitCostInPaise: product.costPriceInPaise,
      referenceType: 'MANUAL_ENTRY',
      notes: 'Initial inventory baseline',
      recordedByUserId,
    });
  }

  // --------------------------------------------------------------------------
  // Physical Stock Adjustment (Audited Reconciliation)
  // --------------------------------------------------------------------------

  async recordStockAdjustment(
    tenantId: string,
    recordedByUserId: string,
    dto: CreateStockAdjustmentDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const location = await this.prisma.stockLocation.findFirst({
      where: { id: dto.locationId, tenantId },
    });
    if (!location) throw new NotFoundException('Location not found');

    const systemQuantity = await this.getProductStock(tenantId, dto.productId, dto.locationId);
    const quantityDelta = dto.physicalQuantity - systemQuantity;

    if (quantityDelta === 0) {
      throw new BadRequestException('Physical count matches system balance exactly. No adjustment needed.');
    }

    const movementType =
      quantityDelta > 0
        ? StockMovementType.ADJUSTMENT_FOUND
        : StockMovementType.ADJUSTMENT_WRITE_OFF;

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          productId: dto.productId,
          locationId: dto.locationId,
          systemQuantity,
          physicalQuantity: dto.physicalQuantity,
          quantityDelta,
          reason: dto.reason.trim(),
          approvedByUserId: recordedByUserId,
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          productId: dto.productId,
          locationId: dto.locationId,
          movementType,
          quantityDelta,
          unitCostInPaise: product.costPriceInPaise,
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: adjustment.id,
          notes: dto.reason.trim(),
          recordedByUserId,
        },
      });

      return adjustment;
    });
  }

  // --------------------------------------------------------------------------
  // Internal Stock Transfer
  // --------------------------------------------------------------------------

  async createTransfer(
    tenantId: string,
    userId: string,
    dto: CreateInventoryTransferDto,
  ) {
    if (dto.sourceLocationId === dto.destLocationId) {
      throw new BadRequestException('Source and destination locations cannot be identical.');
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify stock availability for each item at source location
      for (const item of dto.items) {
        const agg = await tx.stockMovement.aggregate({
          where: { tenantId, productId: item.productId, locationId: dto.sourceLocationId },
          _sum: { quantityDelta: true },
        });
        const available = agg._sum.quantityDelta || 0;
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ID ${item.productId} at source location. Available: ${available}, required: ${item.quantity}`,
          );
        }
      }

      // 2. Create transfer header & items
      const transfer = await tx.inventoryTransfer.create({
        data: {
          tenantId,
          transferNumber,
          sourceBranchId: dto.sourceBranchId,
          sourceLocationId: dto.sourceLocationId,
          destBranchId: dto.destBranchId,
          destLocationId: dto.destLocationId,
          status: InventoryTransferStatus.COMPLETED,
          notes: dto.notes?.trim(),
          transferredBy: userId,
          receivedBy: userId,
          receivedAt: new Date(),
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Post reciprocal immutable movements
      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const cost = product?.costPriceInPaise || 0;

        // Deduction at source
        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId: dto.sourceBranchId,
            productId: item.productId,
            locationId: dto.sourceLocationId,
            movementType: StockMovementType.INTERNAL_TRANSFER_OUT,
            quantityDelta: -item.quantity,
            unitCostInPaise: cost,
            referenceType: 'INVENTORY_TRANSFER',
            referenceId: transfer.id,
            recordedByUserId: userId,
            notes: `Transfer OUT -> ${transferNumber}`,
          },
        });

        // Addition at destination
        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId: dto.destBranchId,
            productId: item.productId,
            locationId: dto.destLocationId,
            movementType: StockMovementType.INTERNAL_TRANSFER_IN,
            quantityDelta: item.quantity,
            unitCostInPaise: cost,
            referenceType: 'INVENTORY_TRANSFER',
            referenceId: transfer.id,
            recordedByUserId: userId,
            notes: `Transfer IN <- ${transferNumber}`,
          },
        });
      }

      return transfer;
    });
  }

  // --------------------------------------------------------------------------
  // Audit Ledger & Valuation Queries
  // --------------------------------------------------------------------------

  async getMovements(tenantId: string, page = 1, limit = 50, productId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (productId) where.productId = productId;

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          location: { select: { id: true, name: true, code: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getStockValuation(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, sku: true, costPriceInPaise: true, sellingPriceInPaise: true },
    });

    const stockMovements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId },
      _sum: { quantityDelta: true },
    });

    const stockMap = new Map<string, number>();
    for (const sm of stockMovements) {
      stockMap.set(sm.productId, sm._sum.quantityDelta || 0);
    }

    let totalCostValuationPaise = 0;
    let totalRetailValuationPaise = 0;
    let totalUnits = 0;

    for (const p of products) {
      const units = Math.max(0, stockMap.get(p.id) || 0);
      totalUnits += units;
      totalCostValuationPaise += units * p.costPriceInPaise;
      totalRetailValuationPaise += units * p.sellingPriceInPaise;
    }

    return {
      totalProductsCount: products.length,
      totalUnitsInStock: totalUnits,
      totalCostValuationPaise,
      totalRetailValuationPaise,
    };
  }
}
