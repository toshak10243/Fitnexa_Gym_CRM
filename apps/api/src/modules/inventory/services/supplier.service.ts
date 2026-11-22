import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSupplierDto } from '../dto/supplier.dto';
import {
  CreatePurchaseOrderDto,
  ReceiveGoodsDto,
} from '../dto/purchase-order.dto';
import { PurchaseOrderStatus, StockMovementType } from '@fitnexa/shared';
import { StockService } from './stock.service';

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  // --------------------------------------------------------------------------
  // Suppliers
  // --------------------------------------------------------------------------

  async getSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        contactPerson: dto.contactPerson?.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim(),
        gstin: dto.gstin?.trim()?.toUpperCase(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        pincode: dto.pincode?.trim(),
      },
    });
  }

  // --------------------------------------------------------------------------
  // Purchase Orders
  // --------------------------------------------------------------------------

  async getPurchaseOrders(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
          supplier: true,
          items: { include: { product: true } },
          goodsReceipts: true,
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where: { tenantId } }),
    ]);

    return { items, total, page, limit };
  }

  async createPurchaseOrder(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ) {
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, costPriceInPaise: true, sellingPriceInPaise: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = dto.items.map((item) => {
      const product = productById.get(item.productId);
      const unitCostInPaise = item.unitCostInPaise > 0
        ? item.unitCostInPaise
        : product?.costPriceInPaise || product?.sellingPriceInPaise || 0;
      if (unitCostInPaise <= 0) {
        throw new BadRequestException('Purchase cost is required for every product');
      }
      return { ...item, unitCostInPaise };
    });
    let totalInPaise = 0;

    for (const item of normalizedItems) {
      totalInPaise += item.quantityOrdered * item.unitCostInPaise;
    }

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        poNumber,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes?.trim(),
        status: PurchaseOrderStatus.ORDERED,
        totalInPaise,
        createdBy: userId,
        items: {
          create: normalizedItems.map((i) => ({
            productId: i.productId,
            quantityOrdered: i.quantityOrdered,
            quantityReceived: 0,
            unitCostInPaise: i.unitCostInPaise,
            totalCostInPaise: i.quantityOrdered * i.unitCostInPaise,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  async receiveGoods(
    tenantId: string,
    purchaseOrderId: string,
    userId: string,
    dto: ReceiveGoodsDto,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const defaultLoc = await this.stockService.getOrCreateDefaultLocation(tenantId, dto.branchId);
    const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Record GoodsReceipt header
      const grn = await tx.goodsReceipt.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          purchaseOrderId: po.id,
          receiptNumber,
          invoiceNumber: dto.invoiceNumber?.trim(),
          notes: dto.notes?.trim(),
          receivedByUserId: userId,
        },
      });

      // 2. Process each received item
      for (const rec of dto.receivedItems) {
        const poItem = po.items.find((i) => i.id === rec.poItemId);
        if (!poItem) continue;

        // Update PO item received quantity
        const updatedQty = poItem.quantityReceived + rec.quantityReceived;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: updatedQty },
        });

        // Add to inventory stock via immutable movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId: dto.branchId,
            productId: poItem.productId,
            locationId: defaultLoc.id,
            movementType: StockMovementType.PURCHASE_RECEIPT,
            quantityDelta: rec.quantityReceived,
            unitCostInPaise: poItem.unitCostInPaise,
            referenceType: 'GOODS_RECEIPT',
            referenceId: grn.id,
            notes: `PO: ${po.poNumber} | GRN: ${receiptNumber}`,
            recordedByUserId: userId,
          },
        });
      }

      // 3. Update overall PO status
      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id },
      });
      const allFullyReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
      const someReceived = refreshedItems.some((i) => i.quantityReceived > 0);

      const status = allFullyReceived
        ? PurchaseOrderStatus.COMPLETED
        : someReceived
        ? PurchaseOrderStatus.PARTIALLY_RECEIVED
        : po.status;

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status },
      });

      return grn;
    });
  }

  async deletePurchaseOrder(tenantId: string, purchaseOrderId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, tenantId }, include: { goodsReceipts: true } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.goodsReceipts.length > 0) {
      throw new BadRequestException('Received purchase orders cannot be deleted. Process a supplier return instead.');
    }
    await this.prisma.purchaseOrder.delete({ where: { id: po.id } });
    return { deleted: true };
  }
}
