import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { BillingSequenceService } from './billing-sequence.service';
import { MemberLedgerService } from './member-ledger.service';
import {
  RequestRefundDto,
  ApproveRefundDto,
  ProcessRefundDto,
} from '../dto/create-renewal.dto';
import {
  LedgerEntryType,
  PaymentMethodType,
  RefundStatus,
  RegisterSessionStatus,
} from '@prisma/client';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly sequenceService: BillingSequenceService,
    private readonly ledgerService: MemberLedgerService,
  ) {}

  /**
   * Submit refund request against an existing payment
   */
  async requestRefund(tenantId: string, currentUserId: string, dto: RequestRefundDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, tenantId },
      include: {
        refunds: {
          where: {
            status: { in: [RefundStatus.APPROVED, RefundStatus.PROCESSED, RefundStatus.PENDING_APPROVAL] },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment transaction not found');

    const totalExistingRefunds = payment.refunds.reduce((sum, r) => sum + r.amountInPaise, 0);
    const availableForRefund = payment.amountInPaise - totalExistingRefunds;

    if (dto.amountInPaise > availableForRefund) {
      throw new BadRequestException(
        `Requested refund (${dto.amountInPaise} paise) exceeds available refundable balance (${availableForRefund} paise)`,
      );
    }

    const refundNumber = await this.sequenceService.generateNumber(tenantId, 'REFUND');

    const refund = await this.prisma.refund.create({
      data: {
        tenantId,
        branchId: payment.branchId,
        paymentId: payment.id,
        refundNumber,
        amountInPaise: dto.amountInPaise,
        reason: dto.reason.trim(),
        status: RefundStatus.PENDING_APPROVAL,
        requestedBy: currentUserId,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'REFUND_REQUESTED',
      resource: 'Refund',
      resourceId: refund.id,
      details: {
        refundNumber,
        amountInPaise: refund.amountInPaise,
        paymentId: payment.id,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return refund;
  }

  /**
   * Approve or reject pending refund (Owner / Admin authorization required)
   */
  async approveRefund(
    tenantId: string,
    refundId: string,
    currentUserId: string,
    dto: ApproveRefundDto,
  ) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, tenantId },
    });

    if (!refund) throw new NotFoundException('Refund request not found');

    if (refund.status !== RefundStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot alter refund in status "${refund.status}"`);
    }

    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: dto.approved ? RefundStatus.APPROVED : RefundStatus.REJECTED,
        approvedBy: currentUserId,
        approvedAt: new Date(),
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: dto.approved ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
      resource: 'Refund',
      resourceId: refundId,
      details: {
        decision: dto.approved ? 'APPROVED' : 'REJECTED',
        notes: dto.notes,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }

  /**
   * Process and record payout confirmation of approved refund
   */
  async processRefund(
    tenantId: string,
    refundId: string,
    currentUserId: string,
    dto: ProcessRefundDto,
  ) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, tenantId },
      include: {
        payment: true,
      },
    });

    if (!refund) throw new NotFoundException('Refund not found');

    if (refund.status !== RefundStatus.APPROVED) {
      throw new BadRequestException('Refund must be approved before processing payout');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.PROCESSED,
          processedAt: new Date(),
          payoutReference: dto.payoutReference.trim(),
        },
      });

      // Update cash drawer if original payment was cash
      if (refund.payment.method === PaymentMethodType.CASH) {
        const activeCashSession = await tx.cashRegisterSession.findFirst({
          where: {
            tenantId,
            branchId: refund.branchId,
            status: RegisterSessionStatus.OPEN,
          },
        });

        if (activeCashSession) {
          await tx.cashRegisterSession.update({
            where: { id: activeCashSession.id },
            data: {
              cashRefundedInPaise: { increment: refund.amountInPaise },
              expectedClosingPaise: { decrement: refund.amountInPaise },
            },
          });
        }
      }

      // Record debit in member account ledger
      await this.ledgerService.recordEntry(
        {
          tenantId,
          memberId: refund.payment.memberId,
          entryType: LedgerEntryType.REFUND_DEBIT,
          amountInPaise: refund.amountInPaise,
          referenceId: refund.id,
          notes: `Refund processed: ${refund.refundNumber}`,
        },
        tx,
      );

      return res;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'REFUND_PROCESSED',
      resource: 'Refund',
      resourceId: refundId,
      details: {
        refundNumber: refund.refundNumber,
        amountInPaise: refund.amountInPaise,
        payoutReference: dto.payoutReference,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }

  /**
   * List all refund records
   */
  async findAll(tenantId: string) {
    return this.prisma.refund.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        payment: {
          include: {
            member: {
              select: { id: true, fullName: true, memberCode: true, phone: true },
            },
          },
        },
      },
    });
  }
}
