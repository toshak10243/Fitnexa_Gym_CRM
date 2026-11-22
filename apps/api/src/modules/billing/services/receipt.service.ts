import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find receipt by ID or Receipt Number
   */
  async findById(tenantId: string, id: string) {
    const receipt = await this.prisma.paymentReceipt.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { receiptNumber: id }],
      },
      include: {
        payment: {
          include: {
            member: {
              select: { id: true, fullName: true, memberCode: true, phone: true },
            },
            collector: {
              select: { id: true, fullName: true },
            },
            branch: {
              select: { id: true, name: true, phone: true, address: true, city: true },
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
            allocations: {
              include: {
                invoice: {
                  select: { id: true, invoiceNumber: true, balanceDueInPaise: true },
                },
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Payment receipt not found');
    }

    return receipt;
  }
}
