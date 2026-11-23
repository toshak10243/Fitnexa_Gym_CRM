import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PosEmailService } from './pos-email.service';
import { StockService } from '../../inventory/services/stock.service';
import { PosCheckoutDto, PosSaleReturnDto } from '../dto/pos-checkout.dto';
import {
  InvoiceStatus,
  PaymentStatus,
  StockMovementType,
  PaymentMethodType,
  RegisterSessionStatus,
  LedgerEntryType,
} from '@fitnexa/shared';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posEmailService: PosEmailService,
    private readonly stockService: StockService,
  ) {}

  private async getNextSequence(
    tx: any,
    tenantId: string,
    sequenceType: string,
    prefix: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await tx.billingSequence.upsert({
      where: {
        tenantId_sequenceType_year: { tenantId, sequenceType, year },
      },
      update: { currentSequence: { increment: 1 } },
      create: { tenantId, sequenceType, year, currentSequence: 1 },
    });
    return `${prefix}-${year}-${seq.currentSequence.toString().padStart(6, '0')}`;
  }

  // --------------------------------------------------------------------------
  // POS Checkout (Transactionally Atomic)
  // --------------------------------------------------------------------------

  async checkout(tenantId: string, userId: string, dto: PosCheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Checkout cart cannot be empty.');
    }

    const productIds = dto.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Each product must appear only once in the cart.');
    }
    const [branch, member, productCount] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
      dto.memberId ? this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } }) : Promise.resolve(null),
      this.prisma.product.count({ where: { id: { in: productIds }, tenantId, isActive: true } }),
    ]);
    if (!branch) throw new NotFoundException('Branch not found.');
    if (dto.memberId && !member) throw new NotFoundException('Member not found.');
    if (productCount !== productIds.length) throw new NotFoundException('Cart contains an unavailable product.');

    const defaultLoc = await this.stockService.getOrCreateDefaultLocation(
      tenantId,
      dto.branchId,
    );

    // If walk-in without member, verify or create a guest walk-in member account if needed,
    // or link to an existing member if provided.
    let memberId = dto.memberId;
    if (!memberId) {
      // Find or create default walk-in member profile for this tenant & branch
      let walkInMember = await this.prisma.member.findFirst({
        where: { tenantId, memberCode: 'MEM-WALKIN-RETAIL' },
      });
      if (!walkInMember) {
        walkInMember = await this.prisma.member.create({
          data: {
            tenantId,
            branchId: dto.branchId,
            memberCode: 'MEM-WALKIN-RETAIL',
            fullName: dto.walkInCustomerName || 'Walk-in Retail Customer',
            phone: dto.walkInCustomerPhone || `9999${Date.now().toString().slice(-6)}`,
            joiningDate: new Date(),
            status: 'ACTIVE',
          },
        });
      }
      memberId = walkInMember.id;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Lock and verify stock for all cart items
      for (const item of dto.items) {
        // Query current aggregate stock for product at location
        const agg = await tx.stockMovement.aggregate({
          where: { tenantId, productId: item.productId, locationId: defaultLoc.id },
          _sum: { quantityDelta: true },
        });
        const currentStock = agg._sum.quantityDelta || 0;

        if (currentStock < item.quantity) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          throw new ConflictException(
            `Insufficient stock for '${prod?.name || item.productId}'. In stock: ${currentStock}, requested: ${item.quantity}.`,
          );
        }
      }

      // 2. Generate Invoice & Payment sequence numbers
      const invoiceNumber = await this.getNextSequence(tx, tenantId, 'INVOICE', 'INV-POS');
      const paymentNumber = await this.getNextSequence(tx, tenantId, 'PAYMENT', 'PAY-POS');
      const receiptNumber = await this.getNextSequence(tx, tenantId, 'RECEIPT', 'RCP-POS');

      // 3. Calculate line items, GST, and totals
      let subtotalInPaise = 0;
      let totalDiscountInPaise = 0;
      let totalTaxInPaise = 0;
      const lineItemsData: any[] = [];

      for (const item of dto.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) throw new NotFoundException(`Product ${item.productId} not found`);

        const lineSubtotal = item.quantity * item.unitPriceInPaise;
        const lineDiscount = item.discountInPaise || 0;
        const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);

        const taxRate = item.taxRatePercentage ?? Number(prod.taxRatePercentage);
        const taxAmount = Math.round((taxableAmount * taxRate) / 100);
        const lineTotal = taxableAmount + taxAmount;

        subtotalInPaise += lineSubtotal;
        totalDiscountInPaise += lineDiscount;
        totalTaxInPaise += taxAmount;

        lineItemsData.push({
          description: `${prod.name} (${prod.sku})`,
          quantity: item.quantity,
          unitPriceInPaise: item.unitPriceInPaise,
          discountInPaise: lineDiscount,
          taxRateBps: Math.round(taxRate * 100),
          taxAmountInPaise: taxAmount,
          totalAmountInPaise: lineTotal,
          itemType: 'PRODUCT_RETAIL',
          referenceId: prod.id,
        });
      }

      const grandTotalInPaise = subtotalInPaise - totalDiscountInPaise + totalTaxInPaise;

      // 4. Create finalized Invoice (PAID)
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: InvoiceStatus.PAID,
          subtotalInPaise,
          discountInPaise: totalDiscountInPaise,
          taxAmountInPaise: totalTaxInPaise,
          grandTotalInPaise,
          paidAmountInPaise: grandTotalInPaise,
          balanceDueInPaise: 0,
          notes: dto.notes || 'Point of Sale Retail Transaction',
          createdBy: userId,
          lineItems: {
            create: lineItemsData,
          },
        },
      });

      // 5. Check if Cash Register Drawer Session is open (if paid in cash)
      let registerSessionId: string | undefined = undefined;
      if (dto.paymentMethod === PaymentMethodType.CASH) {
        const activeRegister = await tx.cashRegisterSession.findFirst({
          where: { tenantId, branchId: dto.branchId, status: RegisterSessionStatus.OPEN },
        });
        if (activeRegister) {
          registerSessionId = activeRegister.id;
          await tx.cashRegisterSession.update({
            where: { id: activeRegister.id },
            data: {
              cashCollectedInPaise: { increment: grandTotalInPaise },
              expectedClosingPaise: { increment: grandTotalInPaise },
            },
          });
        }
      }

      // 6. Create Payment & Receipt
      const payment = await tx.payment.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId,
          registerSessionId,
          paymentNumber,
          amountInPaise: grandTotalInPaise,
          unallocatedInPaise: 0,
          method: dto.paymentMethod,
          referenceNumber: dto.paymentReference || null,
          paymentDate: new Date(),
          status: PaymentStatus.VERIFIED,
          notes: `POS Checkout for ${invoiceNumber}`,
          collectedBy: userId,
          allocations: {
            create: {
              tenantId,
              invoiceId: invoice.id,
              allocatedInPaise: grandTotalInPaise,
              allocatedBy: userId,
            },
          },
        },
      });

      const receipt = await tx.paymentReceipt.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          paymentId: payment.id,
          receiptNumber,
          issuedAt: new Date(),
          issuedBy: userId,
          snapshotData: {
            invoiceNumber,
            customerName: dto.walkInCustomerName || 'Member',
            items: lineItemsData,
            grandTotalInPaise,
            paymentMethod: dto.paymentMethod,
          },
        },
      });

      // 7. Decrement Inventory via immutable StockMovement
      for (const item of dto.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId: dto.branchId,
            productId: item.productId,
            locationId: defaultLoc.id,
            movementType: StockMovementType.POS_SALE,
            quantityDelta: -item.quantity,
            unitCostInPaise: prod?.costPriceInPaise || 0,
            referenceType: 'POS_INVOICE',
            referenceId: invoice.id,
            notes: `POS Sale: ${invoiceNumber}`,
            recordedByUserId: userId,
          },
        });
      }

      // 8. Member double-entry account ledger
      if (dto.memberId) {
        // Debit invoice charge
        await tx.memberAccountLedger.create({
          data: {
            tenantId,
            memberId,
            entryType: LedgerEntryType.INVOICE_CHARGE,
            amountInPaise: grandTotalInPaise,
            runningBalancePaise: 0,
            referenceId: invoice.id,
            notes: `POS Retail Invoice #${invoiceNumber}`,
          },
        });
        // Credit payment
        await tx.memberAccountLedger.create({
          data: {
            tenantId,
            memberId,
            entryType: LedgerEntryType.PAYMENT_CREDIT,
            amountInPaise: grandTotalInPaise,
            runningBalancePaise: 0,
            referenceId: payment.id,
            notes: `Payment for POS #${invoiceNumber}`,
          },
        });
      }

      return {
        invoice,
        payment,
        receipt,
      };
    });

    // Receipt email is deliberately sent after the database transaction. A mail outage must never roll back a paid sale.
    try {
      const [tenant, member, products] = await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, email: true, phone: true, address: true, city: true, state: true, pincode: true, gstin: true, pan: true, logoUrl: true, website: true, whatsapp: true } }),
        dto.memberId ? this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId }, select: { fullName: true, email: true } }) : null,
        this.prisma.product.findMany({ where: { id: { in: dto.items.map((item) => item.productId) }, tenantId }, select: { id: true, name: true, sku: true, photoUrl: true } }),
      ]);
      if (tenant && (member?.email || dto.walkInCustomerEmail)) {
        await this.posEmailService.sendReceipt({
          to: member?.email || dto.walkInCustomerEmail,
          customerName: member?.fullName || dto.walkInCustomerName || 'Customer',
          tenant,
          invoice: result.invoice,
          paymentMethod: dto.paymentMethod,
          items: dto.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            const taxable = item.quantity * item.unitPriceInPaise - (item.discountInPaise || 0);
            const tax = Math.round((taxable * (item.taxRatePercentage || 0)) / 100);
            return { description: `${product?.name || 'Product'} (${product?.sku || ''})`, quantity: item.quantity, unitPriceInPaise: item.unitPriceInPaise, taxRatePercentage: item.taxRatePercentage || 0, totalAmountInPaise: taxable + tax, photoUrl: product?.photoUrl };
          }),
        });
      }
    } catch (error) {
      // Payment success is independent from email delivery; log without exposing customer data.
      console.error('POS receipt email delivery failed', error instanceof Error ? error.message : error);
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Sales Ledger & Detail Queries
  // --------------------------------------------------------------------------

  async getSales(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      invoiceNumber: { startsWith: 'INV-POS' },
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          member: { select: { id: true, fullName: true, phone: true, memberCode: true } },
          lineItems: true,
          allocations: { include: { payment: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getSaleById(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        member: true,
        lineItems: true,
        allocations: {
          include: {
            payment: {
              include: { receipt: true },
            },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Sale invoice not found');
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, sku: true, photoUrl: true, category: { select: { name: true } } },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    return { ...invoice, lineItems: invoice.lineItems.map((item) => {
      const sku = String(item.description || '').match(/\(([^)]+)\)$/)?.[1];
      const product = (item.referenceId ? productMap.get(item.referenceId) : undefined) || products.find((candidate) => candidate.sku === sku);
      return { ...item, product: product || null };
    }) };
  }

  // --------------------------------------------------------------------------
  // POS Return & Refund Workflow
  // --------------------------------------------------------------------------

  async processReturn(
    tenantId: string,
    invoiceId: string,
    userId: string,
    dto: PosSaleReturnDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!invoice.invoiceNumber.startsWith('INV-POS')) throw new BadRequestException('Only POS invoices can be returned here.');
    const returnIds = dto.items.map((item) => item.invoiceLineItemId);
    if (!returnIds.length || new Set(returnIds).size !== returnIds.length) {
      throw new BadRequestException('Include each returned line once.');
    }

    const defaultLoc = await this.stockService.getOrCreateDefaultLocation(
      tenantId,
      invoice.branchId,
    );

    return this.prisma.$transaction(async (tx) => {
      // Serialize returns for this invoice so two requests cannot refund the
      // same remaining quantity concurrently.
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoice.id} FOR UPDATE`;
      let totalRefundInPaise = 0;

      for (const retItem of dto.items) {
        const line = invoice.lineItems.find((l) => l.id === retItem.invoiceLineItemId);
        if (!line) {
          throw new NotFoundException(`Invoice line item ${retItem.invoiceLineItemId} not found`);
        }
        const previousReturns = line.referenceId ? await tx.stockMovement.aggregate({
          where: { tenantId, productId: line.referenceId, referenceType: 'POS_RETURN', referenceId: invoice.id },
          _sum: { quantityDelta: true },
        }) : null;
        const returnedQuantity = previousReturns?._sum.quantityDelta || 0;
        if (retItem.quantity > line.quantity - returnedQuantity) {
          throw new BadRequestException('Return quantity cannot exceed purchased quantity.');
        }

        const unitPriceWithTax = Math.round(line.totalAmountInPaise / line.quantity);
        const itemRefund = unitPriceWithTax * retItem.quantity;
        totalRefundInPaise += itemRefund;

        // Restore stock via StockMovement (SALE_RETURN)
        if (line.referenceId) {
          const prod = await tx.product.findUnique({ where: { id: line.referenceId } });
          await tx.stockMovement.create({
            data: {
              tenantId,
              branchId: invoice.branchId,
              productId: line.referenceId,
              locationId: defaultLoc.id,
              movementType: StockMovementType.SALE_RETURN,
              quantityDelta: retItem.quantity,
              unitCostInPaise: prod?.costPriceInPaise || 0,
              referenceType: 'POS_RETURN',
              referenceId: invoice.id,
              notes: `POS Return: ${retItem.reason}`,
              recordedByUserId: userId,
            },
          });
        }
      }

      // If refunded in cash, update active drawer
      if (dto.refundMethod === PaymentMethodType.CASH) {
        const activeRegister = await tx.cashRegisterSession.findFirst({
          where: { tenantId, branchId: invoice.branchId, status: RegisterSessionStatus.OPEN },
        });
        if (activeRegister) {
          await tx.cashRegisterSession.update({
            where: { id: activeRegister.id },
            data: {
              cashRefundedInPaise: { increment: totalRefundInPaise },
              expectedClosingPaise: { decrement: totalRefundInPaise },
            },
          });
        }
      }

      return {
        success: true,
        invoiceId: invoice.id,
        totalRefundInPaise,
        message: 'Return processed and inventory restocked successfully.',
      };
    });
  }
}
