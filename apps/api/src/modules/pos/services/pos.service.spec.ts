import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PosService } from './pos.service';
import { PrismaService } from '../../../database/prisma.service';
import { StockService } from '../../inventory/services/stock.service';
import { PosEmailService } from './pos-email.service';
import { PosCheckoutDto } from '../dto/pos-checkout.dto';

jest.mock('./pos-email.service', () => ({ PosEmailService: class {} }));

describe('POS cart validation', () => {
  const prisma = { branch: { findFirst: jest.fn() }, member: { findFirst: jest.fn() }, product: { count: jest.fn() }, invoice: { findFirst: jest.fn() }, $transaction: jest.fn() };
  const stock = { getOrCreateDefaultLocation: jest.fn() };
  const service = new PosService(prisma as unknown as PrismaService, {} as PosEmailService, stock as unknown as StockService);
  const item = { productId: 'product', quantity: 1, unitPriceInPaise: 100 };
  const dto = { branchId: 'branch', items: [item], paymentMethod: 'CASH' } as PosCheckoutDto;
  beforeEach(() => { jest.clearAllMocks(); prisma.branch.findFirst.mockResolvedValue({ id: 'branch' }); prisma.product.count.mockResolvedValue(1); });
  it('rejects duplicate products that could bypass individual stock checks', async () => {
    await expect(service.checkout('tenant', 'user', { ...dto, items: [item, item] })).rejects.toBeInstanceOf(BadRequestException);
    expect(stock.getOrCreateDefaultLocation).not.toHaveBeenCalled();
  });
  it('rejects another tenant branch', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);
    await expect(service.checkout('tenant', 'user', dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(stock.getOrCreateDefaultLocation).not.toHaveBeenCalled();
  });
  it('rejects another tenant member before writing a sale', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.checkout('tenant', 'user', { ...dto, memberId: 'foreign-member' })).rejects.toBeInstanceOf(NotFoundException);
    expect(stock.getOrCreateDefaultLocation).not.toHaveBeenCalled();
  });
  it('rejects inactive or foreign products', async () => {
    prisma.product.count.mockResolvedValue(0);
    await expect(service.checkout('tenant', 'user', dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(stock.getOrCreateDefaultLocation).not.toHaveBeenCalled();
  });
  it('prevents returning the same purchased quantity twice', async () => {
    prisma.invoice.findFirst.mockResolvedValue({ id: 'invoice', invoiceNumber: 'INV-POS-1', branchId: 'branch', lineItems: [{ id: 'line', referenceId: 'product', quantity: 2, totalAmountInPaise: 200 }] });
    stock.getOrCreateDefaultLocation.mockResolvedValue({ id: 'location' });
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]), stockMovement: { aggregate: jest.fn().mockResolvedValue({ _sum: { quantityDelta: 2 } }), create: jest.fn() } };
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    await expect(service.processReturn('tenant', 'invoice', 'user', { refundMethod: dto.paymentMethod, items: [{ invoiceLineItemId: 'line', quantity: 1, reason: 'Return' }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
