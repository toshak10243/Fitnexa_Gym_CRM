import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { BillingSequenceService } from './billing-sequence.service';
import { MemberLedgerService } from './member-ledger.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceQueryDto, VoidInvoiceDto } from '../dto/invoice-query.dto';
import { InvoiceStatus, LedgerEntryType, Prisma } from '@prisma/client';
import { calculateLineItemFinancials } from '../../../common/utils/financial.util';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly sequenceService: BillingSequenceService,
    private readonly ledgerService: MemberLedgerService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generates an authoritative tax invoice with integer paise precision
   */
  async create(tenantId: string, currentUserId: string, dto: CreateInvoiceDto, sendEmail = true) {
    const [member, branch] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
    ]);

    if (!member) throw new NotFoundException('Member record not found');
    if (!branch) throw new BadRequestException('Target branch not found');

    if (!dto.lineItems || dto.lineItems.length === 0) {
      throw new BadRequestException('Invoice must have at least one line item');
    }

    // Generate atomic sequential invoice number
    const invoiceNumber = await this.sequenceService.generateNumber(tenantId, 'INVOICE');

    // Compute Line Items
    let subtotalInPaise = 0;
    let totalTaxInPaise = 0;
    let grandTotalInPaise = 0;

    const computedLineItems = dto.lineItems.map((item) => {
      const qty = item.quantity ?? 1;
      const discount = item.discountInPaise ?? 0;
      const taxRateBps = item.taxRateBps ?? 1800;

      const calc = calculateLineItemFinancials(
        item.unitPriceInPaise,
        qty,
        discount,
        taxRateBps,
        dto.isTaxInclusive || false,
      );

      subtotalInPaise += calc.taxableAmountInPaise;
      totalTaxInPaise += calc.taxAmountInPaise;
      grandTotalInPaise += calc.totalAmountInPaise;

      return {
        description: item.description.trim(),
        quantity: qty,
        unitPriceInPaise: item.unitPriceInPaise,
        discountInPaise: discount,
        taxRateBps,
        taxAmountInPaise: calc.taxAmountInPaise,
        totalAmountInPaise: calc.totalAmountInPaise,
        itemType: item.itemType,
        referenceId: item.referenceId || null,
      };
    });

    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
    const dueDate = new Date(dto.dueDate);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId: dto.memberId,
          membershipId: dto.membershipId || null,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          invoiceDate,
          dueDate,
          subtotalInPaise,
          discountInPaise: 0,
          taxRateBps: dto.lineItems[0]?.taxRateBps ?? 1800,
          taxAmountInPaise: totalTaxInPaise,
          isTaxInclusive: dto.isTaxInclusive || false,
          grandTotalInPaise,
          paidAmountInPaise: 0,
          balanceDueInPaise: grandTotalInPaise,
          notes: dto.notes?.trim() || null,
          termsAndConditions: dto.termsAndConditions?.trim() || null,
          createdBy: currentUserId,
          lineItems: {
            createMany: {
              data: computedLineItems,
            },
          },
        },
        include: {
          lineItems: true,
          member: {
            select: { id: true, fullName: true, memberCode: true, phone: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // Record charge in member ledger
      await this.ledgerService.recordEntry(
        {
          tenantId,
          memberId: dto.memberId,
          entryType: LedgerEntryType.INVOICE_CHARGE,
          amountInPaise: grandTotalInPaise,
          referenceId: created.id,
          notes: `Invoice issued: ${invoiceNumber}`,
        },
        tx,
      );

      return created;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'INVOICE_ISSUED',
      resource: 'Invoice',
      resourceId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        grandTotalInPaise: invoice.grandTotalInPaise,
        memberId: invoice.memberId,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    const emailDelivery = sendEmail ? await this.emailInvoice(tenantId, invoice.id, currentUserId) : undefined;
    return { ...invoice, emailDelivery };
  }

  async emailInvoice(tenantId: string, invoiceId: string, currentUserId: string) {
    const invoice = await this.findById(tenantId, invoiceId);
    if (!invoice.member.email) return { success: false, reason: 'Member email is missing' };
    const user = await this.prisma.user.findFirst({ where: { id: currentUserId, tenantId }, select: { id: true, fullName: true, role: true, email: true } });
    if (!user) throw new NotFoundException('Invoice sender not found');
    try {
      return await this.mailService.sendBillingInvoiceEmail({
        to: invoice.member.email, memberName: invoice.member.fullName, memberCode: invoice.member.memberCode, memberId: invoice.memberId,
        invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, gymName: invoice.tenant.name, logoUrl: invoice.tenant.logoUrl,
        address: [invoice.tenant.address, invoice.tenant.city, invoice.tenant.state, invoice.tenant.pincode].filter(Boolean).join(', '), contact: [invoice.tenant.phone, invoice.tenant.email, invoice.tenant.website].filter(Boolean).join(' | '),
        user, tenant: invoice.tenant, invoice, total: invoice.grandTotalInPaise, paid: invoice.paidAmountInPaise, due: invoice.balanceDueInPaise, subtotal: invoice.subtotalInPaise, tax: invoice.taxAmountInPaise, dueDate: invoice.dueDate,
        planName: invoice.membership?.plan.name, startDate: invoice.membership?.startDate, endDate: invoice.membership?.endDate,
        items: invoice.lineItems, payments: invoice.allocations.map(allocation => ({ method: allocation.payment.method, reference: allocation.payment.referenceNumber, amount: allocation.allocatedInPaise })),
      });
    } catch (error) {
      this.logger.error(`Invoice email failed for ${invoice.id}: ${error instanceof Error ? error.message : 'Delivery error'}`);
      return { success: false, reason: 'Invoice saved; email delivery failed' };
    }
  }

  /**
   * List invoices with search, filters and pagination
   */
  async findAll(tenantId: string, query: InvoiceQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { member: { fullName: { contains: s, mode: 'insensitive' } } },
        { member: { phone: { contains: s } } },
        { member: { memberCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate && query.endDate) {
      where.invoiceDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          member: {
            select: { id: true, fullName: true, memberCode: true, phone: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
          allocations: {
            select: { id: true, allocatedInPaise: true, allocatedAt: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single invoice with all details, line items, and payment allocations
   */
  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        membership: { include: { plan: true } },
        member: {
          select: {
            id: true,
            fullName: true,
            memberCode: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            phone: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            gstin: true,
            pan: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            logoUrl: true,
            website: true,
            instagram: true,
            whatsapp: true,
            currency: true,
            timezone: true,
          },
        },
        lineItems: true,
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                method: true,
                referenceNumber: true,
                paymentDate: true,
              },
            },
          },
        },
        creditNotes: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice record not found');
    }

    return invoice;
  }

  /**
   * Void an unpaid invoice
   */
  async void(tenantId: string, id: string, currentUserId: string, dto: VoidInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { allocations: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Invoice is already voided');
    }

    if (invoice.paidAmountInPaise > 0 || invoice.allocations.length > 0) {
      throw new BadRequestException('Cannot void an invoice with paid allocations. Issue a refund or credit note instead.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.VOID,
          voidReason: dto.voidReason?.trim() || 'Voided by authorized manager',
          voidedAt: new Date(),
        },
      });

      // Reverse invoice charge in member ledger
      await this.ledgerService.recordEntry(
        {
          tenantId,
          memberId: invoice.memberId,
          entryType: LedgerEntryType.CREDIT_NOTE,
          amountInPaise: -invoice.grandTotalInPaise,
          referenceId: invoice.id,
          notes: `Invoice voided: ${invoice.invoiceNumber}`,
        },
        tx,
      );

      return res;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'INVOICE_VOIDED',
      resource: 'Invoice',
      resourceId: id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        voidReason: dto.voidReason,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }
}
