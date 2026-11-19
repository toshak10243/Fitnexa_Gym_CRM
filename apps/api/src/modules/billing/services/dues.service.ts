import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { DuesQueryDto, UpdateDueDateDto } from '../dto/payment-query.dto';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { categorizeDuesAging } from '../../../common/utils/financial.util';

@Injectable()
export class DuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Calculates comprehensive dues and aging distribution
   */
  async getDuesSummary(tenantId: string, query: DuesQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      balanceDueInPaise: { gt: 0 },
      status: {
        in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
      },
    };

    if (query.branchId) where.branchId = query.branchId;
    if (query.memberId) where.memberId = query.memberId;

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { member: { fullName: { contains: s, mode: 'insensitive' } } },
        { member: { phone: { contains: s } } },
        { member: { memberCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Retrieve all outstanding invoices for tenant to calculate aggregate aging metrics
    const allOutstanding = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        dueDate: true,
        balanceDueInPaise: true,
      },
    });

    const now = new Date();
    let totalOutstandingPaise = 0;
    let notDuePaise = 0;
    let overdue1to7Paise = 0;
    let overdue8to30Paise = 0;
    let overdue31to60Paise = 0;
    let overdue60PlusPaise = 0;
    let overdueInvoicesCount = 0;

    const invoiceBucketMap = new Map<string, string>();

    for (const inv of allOutstanding) {
      totalOutstandingPaise += inv.balanceDueInPaise;
      const bucket = categorizeDuesAging(inv.dueDate, now);
      invoiceBucketMap.set(inv.id, bucket);

      if (bucket === 'NOT_DUE') {
        notDuePaise += inv.balanceDueInPaise;
      } else {
        overdueInvoicesCount++;
        if (bucket === 'OVERDUE_1_7') overdue1to7Paise += inv.balanceDueInPaise;
        else if (bucket === 'OVERDUE_8_30') overdue8to30Paise += inv.balanceDueInPaise;
        else if (bucket === 'OVERDUE_31_60') overdue31to60Paise += inv.balanceDueInPaise;
        else if (bucket === 'OVERDUE_60_PLUS') overdue60PlusPaise += inv.balanceDueInPaise;
      }
    }

    // Filter by aging bucket if requested
    let filteredIds = allOutstanding.map((i) => i.id);
    if (query.agingBucket) {
      filteredIds = allOutstanding
        .filter((i) => invoiceBucketMap.get(i.id) === query.agingBucket)
        .map((i) => i.id);
    }

    const total = filteredIds.length;
    const paginatedIds = filteredIds.slice((page - 1) * limit, page * limit);

    const items = await this.prisma.invoice.findMany({
      where: {
        id: { in: paginatedIds },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        member: {
          select: { id: true, fullName: true, memberCode: true, phone: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const itemsWithBucket = items.map((inv) => ({
      ...inv,
      agingBucket: invoiceBucketMap.get(inv.id) || 'NOT_DUE',
    }));

    return {
      summary: {
        totalOutstandingPaise,
        notDuePaise,
        overdue1to7Paise,
        overdue8to30Paise,
        overdue31to60Paise,
        overdue60PlusPaise,
        overdueInvoicesCount,
      },
      items: itemsWithBucket,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update due date with explicit audit logging
   */
  async updateDueDate(
    tenantId: string,
    invoiceId: string,
    currentUserId: string,
    dto: UpdateDueDateDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const oldDueDate = invoice.dueDate;
    const newDueDate = new Date(dto.newDueDate);

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { dueDate: newDueDate },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'INVOICE_DUE_DATE_UPDATED',
      resource: 'Invoice',
      resourceId: invoiceId,
      details: {
        oldDueDate,
        newDueDate,
        reason: dto.reason,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }
}
