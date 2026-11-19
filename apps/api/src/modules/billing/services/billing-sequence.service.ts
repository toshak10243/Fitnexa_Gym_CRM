import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type SequenceType = 'INVOICE' | 'RECEIPT' | 'PAYMENT' | 'REFUND' | 'CREDIT_NOTE';

@Injectable()
export class BillingSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a concurrency-safe sequential financial document identifier
   * E.g. FX-INV-2026-000001 or FX-REC-2026-000001
   */
  async generateNumber(
    tenantId: string,
    sequenceType: SequenceType,
    customYear?: number,
  ): Promise<string> {
    const year = customYear || new Date().getFullYear();

    // Use Prisma transaction with upsert & atomic increment to guarantee safe sequence generation
    const sequence = await this.prisma.$transaction(async (tx) => {
      // Find or create
      const existing = await tx.billingSequence.findUnique({
        where: {
          tenantId_sequenceType_year: {
            tenantId,
            sequenceType,
            year,
          },
        },
      });

      if (!existing) {
        return tx.billingSequence.create({
          data: {
            tenantId,
            sequenceType,
            year,
            currentSequence: 1,
          },
        });
      } else {
        return tx.billingSequence.update({
          where: { id: existing.id },
          data: { currentSequence: { increment: 1 } },
        });
      }
    });

    const prefixMap: Record<SequenceType, string> = {
      INVOICE: 'FX-INV',
      RECEIPT: 'FX-REC',
      PAYMENT: 'FX-PAY',
      REFUND: 'FX-REF',
      CREDIT_NOTE: 'FX-CN',
    };

    const prefix = prefixMap[sequenceType];
    const padded = sequence.currentSequence.toString().padStart(6, '0');
    return `${prefix}-${year}-${padded}`;
  }
}
