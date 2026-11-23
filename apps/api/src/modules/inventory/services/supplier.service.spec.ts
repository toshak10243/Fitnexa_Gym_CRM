import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../../../database/prisma.service';
import { StockService } from './stock.service';

describe('Purchase receiving validation', () => {
  const po = { id: 'po', branchId: 'branch', status: 'ORDERED', items: [{ id: 'item', quantityOrdered: 10, quantityReceived: 6 }] };
  const prisma = { purchaseOrder: { findFirst: jest.fn() }, $transaction: jest.fn() };
  const stock = { getOrCreateDefaultLocation: jest.fn() };
  const service = new SupplierService(prisma as unknown as PrismaService, stock as unknown as StockService);
  beforeEach(() => { jest.clearAllMocks(); prisma.purchaseOrder.findFirst.mockResolvedValue(po); });
  it.each([
    ['another-branch', [{ poItemId: 'item', quantityReceived: 1 }]],
    ['branch', [{ poItemId: 'item', quantityReceived: 5 }]],
    ['branch', [{ poItemId: 'foreign-item', quantityReceived: 1 }]],
    ['branch', [{ poItemId: 'item', quantityReceived: 1 }, { poItemId: 'item', quantityReceived: 1 }]],
    ['branch', []],
  ])('rejects invalid receiving before creating stock (%s)', async (branchId, receivedItems) => {
    await expect(service.receiveGoods('tenant', 'po', 'user', { branchId, receivedItems })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(stock.getOrCreateDefaultLocation).not.toHaveBeenCalled();
  });
  it('rejects a purchase order belonging to another tenant', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(null);
    await expect(service.receiveGoods('tenant', 'foreign-po', 'user', { branchId: 'branch', receivedItems: [] })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign-po', tenantId: 'tenant' } }));
  });
});
