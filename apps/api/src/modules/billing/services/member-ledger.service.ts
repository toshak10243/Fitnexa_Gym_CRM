import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerEntryType, Prisma } from '@prisma/client';

export interface RecordLedgerParams {
  tenantId: string;
  memberId: string;
  entryType: LedgerEntryType;
  amountInPaise: number; // Positive for charges/debits, negative for credits/payments
  referenceId: string;
  notes?: string;
}

@Injectable()
export class MemberLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a double-entry style financial transaction in member account ledger
   */
  async recordEntry(
    params: RecordLedgerParams,
    txClient?: Prisma.TransactionClient,
  ) {
    const db = txClient || this.prisma;

    // Fetch member's latest balance
    const latestEntry = await db.memberAccountLedger.findFirst({
      where: { tenantId: params.tenantId, memberId: params.memberId },
      orderBy: { recordedAt: 'desc' },
      select: { runningBalancePaise: true },
    });

    const previousBalance = latestEntry?.runningBalancePaise ?? 0;
    const runningBalancePaise = previousBalance + params.amountInPaise;

    return db.memberAccountLedger.create({
      data: {
        tenantId: params.tenantId,
        memberId: params.memberId,
        entryType: params.entryType,
        amountInPaise: params.amountInPaise,
        runningBalancePaise,
        referenceId: params.referenceId,
        notes: params.notes,
      },
    });
  }

  /**
   * Get member ledger history
   */
  async getMemberLedger(tenantId: string, memberId: string) {
    return this.prisma.memberAccountLedger.findMany({
      where: { tenantId, memberId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
  }
}
