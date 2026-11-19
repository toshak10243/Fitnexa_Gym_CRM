import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { BillingSequenceService } from './billing-sequence.service';
import { MemberLedgerService } from './member-ledger.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import {
  InvoiceStatus,
  LedgerEntryType,
  MembershipStatus,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  RegisterSessionStatus,
} from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly sequenceService: BillingSequenceService,
    private readonly ledgerService: MemberLedgerService,
  ) {}

  /**
   * Record payment transaction, execute atomic partial/full allocations,
   * issue payment receipt, and update register drawer
   */
  async create(tenantId: string, currentUserId: string, dto: CreatePaymentDto) {
    if (dto.amountInPaise <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const [member, branch] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
    ]);

    if (!member) throw new NotFoundException('Member record not found');
    if (!branch) throw new BadRequestException('Branch not found');

    // If cash payment, find active open register session for this branch
    let activeCashSession = null;
    if (dto.method === PaymentMethodType.CASH) {
      activeCashSession = await this.prisma.cashRegisterSession.findFirst({
        where: {
          tenantId,
          branchId: dto.branchId,
          status: RegisterSessionStatus.OPEN,
        },
      });
    }

    // Verify allocations do not exceed collected payment amount
    const totalAllocated = (dto.allocations || []).reduce(
      (sum, a) => sum + a.amountInPaise,
      0,
    );
    if (totalAllocated > dto.amountInPaise) {
      throw new BadRequestException(
        `Total allocated amounts (${totalAllocated} paise) exceeds collected payment amount (${dto.amountInPaise} paise)`,
      );
    }

    const unallocatedInPaise = dto.amountInPaise - totalAllocated;

    // Concurrency safe numbering
    const paymentNumber = await this.sequenceService.generateNumber(tenantId, 'PAYMENT');
    const receiptNumber = await this.sequenceService.generateNumber(tenantId, 'RECEIPT');

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    const payment = await this.prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const createdPayment = await tx.payment.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberId: dto.memberId,
          registerSessionId: activeCashSession?.id || null,
          paymentNumber,
          amountInPaise: dto.amountInPaise,
          unallocatedInPaise,
          method: dto.method,
          referenceNumber: dto.referenceNumber?.trim() || null,
          paymentDate,
          status: PaymentStatus.VERIFIED,
          notes: dto.notes?.trim() || null,
          collectedBy: currentUserId,
        },
      });

      // 2. Process Allocations
      if (dto.allocations && dto.allocations.length > 0) {
        for (const alloc of dto.allocations) {
          const invoice = await tx.invoice.findFirst({
            where: { id: alloc.invoiceId, tenantId },
            include: { membership: true },
          });

          if (!invoice) {
            throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
          }

          if (alloc.amountInPaise > invoice.balanceDueInPaise) {
            throw new ConflictException(
              `Allocation of ${alloc.amountInPaise} paise exceeds outstanding invoice balance of ${invoice.balanceDueInPaise} paise for invoice ${invoice.invoiceNumber}`,
            );
          }

          const newPaidAmount = invoice.paidAmountInPaise + alloc.amountInPaise;
          const newBalanceDue = invoice.balanceDueInPaise - alloc.amountInPaise;
          const newStatus =
            newBalanceDue === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmountInPaise: newPaidAmount,
              balanceDueInPaise: newBalanceDue,
              status: newStatus,
            },
          });

          await tx.paymentAllocation.create({
            data: {
              tenantId,
              paymentId: createdPayment.id,
              invoiceId: invoice.id,
              allocatedInPaise: alloc.amountInPaise,
              allocatedBy: currentUserId,
            },
          });

          // Activate pending membership upon receiving payment
          if (invoice.membershipId && invoice.membership?.status === MembershipStatus.PENDING) {
            await tx.memberMembership.update({
              where: { id: invoice.membershipId },
              data: { status: MembershipStatus.ACTIVE },
            });

            await tx.membershipStatusHistory.create({
              data: {
                memberMembershipId: invoice.membershipId,
                fromStatus: MembershipStatus.PENDING,
                toStatus: MembershipStatus.ACTIVE,
                reason: `Payment collected: ${paymentNumber}`,
                changedBy: currentUserId,
              },
            });
          }
        }
      }

      // 3. Create Payment Receipt Snapshot
      await tx.paymentReceipt.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          paymentId: createdPayment.id,
          receiptNumber,
          issuedBy: currentUserId,
          snapshotData: {
            receiptNumber,
            paymentNumber,
            memberName: member.fullName,
            memberCode: member.memberCode,
            branchName: branch.name,
            amountInPaise: dto.amountInPaise,
            method: dto.method,
            referenceNumber: dto.referenceNumber || 'N/A',
            paymentDate: paymentDate.toISOString(),
            allocations: (dto.allocations || []) as unknown as Prisma.InputJsonValue,
          },
        },
      });

      // 4. Update Cash Register Session if cash
      if (activeCashSession) {
        await tx.cashRegisterSession.update({
          where: { id: activeCashSession.id },
          data: {
            cashCollectedInPaise: { increment: dto.amountInPaise },
            expectedClosingPaise: { increment: dto.amountInPaise },
          },
        });
      }

      // 5. Record Credit in Member Account Ledger (reducing member debt)
      await this.ledgerService.recordEntry(
        {
          tenantId,
          memberId: dto.memberId,
          entryType: LedgerEntryType.PAYMENT_CREDIT,
          amountInPaise: -dto.amountInPaise,
          referenceId: createdPayment.id,
          notes: `Payment received: ${paymentNumber} (${dto.method})`,
        },
        tx,
      );

      return createdPayment;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'PAYMENT_RECORDED',
      resource: 'Payment',
      resourceId: payment.id,
      details: {
        paymentNumber: payment.paymentNumber,
        amountInPaise: payment.amountInPaise,
        method: payment.method,
        memberId: payment.memberId,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return this.findById(tenantId, payment.id);
  }

  /**
   * List payments with filters
   */
  async findAll(tenantId: string, query: PaymentQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { tenantId };

    if (query.memberId) where.memberId = query.memberId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.method) where.method = query.method;
    if (query.status) where.status = query.status;

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { paymentNumber: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { member: { fullName: { contains: s, mode: 'insensitive' } } },
        { member: { phone: { contains: s } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          member: {
            select: { id: true, fullName: true, memberCode: true, phone: true },
          },
          collector: {
            select: { id: true, fullName: true },
          },
          receipt: {
            select: { id: true, receiptNumber: true },
          },
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true, grandTotalInPaise: true },
              },
            },
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
   * Find single payment with receipt and allocations
   */
  async findById(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        member: {
          select: { id: true, fullName: true, memberCode: true, phone: true, email: true },
        },
        collector: {
          select: { id: true, fullName: true, role: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        receipt: true,
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                invoiceDate: true,
                grandTotalInPaise: true,
                balanceDueInPaise: true,
              },
            },
          },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    return payment;
  }
}
