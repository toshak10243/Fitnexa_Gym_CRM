import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ApproveExpenseDto,
} from '../dto/expense.dto';
import {
  ExpenseStatus,
  ExpensePaymentMethod,
  RegisterSessionStatus,
  UserRole,
} from '@fitnexa/shared';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Categories & Auto-seeding
  // --------------------------------------------------------------------------

  async getCategories(tenantId: string) {
    let categories = await this.prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      // Seed standard gym expense categories
      const defaults = [
        { name: 'Facility Rent & Lease', code: 'RENT', description: 'Commercial premises monthly rental' },
        { name: 'Electricity & Utilities', code: 'ELECTRICITY', description: 'Power grid bills and HVAC electricity' },
        { name: 'Equipment Maintenance', code: 'MAINTENANCE', description: 'Bi-annual cardio machine & cable servicing' },
        { name: 'Cleaning & Housekeeping', code: 'CLEANING', description: 'Sanitation chemicals, towels, wipes' },
        { name: 'Drinking Water & Dispensers', code: 'WATER', description: 'Purified water jars and cooler refills' },
        { name: 'Marketing & Promotions', code: 'MARKETING', description: 'Meta ads, flex printing, flyers' },
        { name: 'Staff Amenities & Tea', code: 'STAFF_AMENITIES', description: 'Pantry tea, coffee, employee snacks' },
        { name: 'General & Miscellaneous', code: 'MISCELLANEOUS', description: 'Small petty cash expenses' },
      ];

      await this.prisma.expenseCategory.createMany({
        data: defaults.map((d) => ({
          tenantId,
          ...d,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      categories = await this.prisma.expenseCategory.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    return categories;
  }

  async createCategory(tenantId: string, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Expense category code '${dto.code}' already exists.`);
    }

    return this.prisma.expenseCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
      },
    });
  }

  // --------------------------------------------------------------------------
  // Expenses Ledger
  // --------------------------------------------------------------------------

  async getExpenses(
    tenantId: string,
    params: {
      categoryId?: string;
      status?: ExpenseStatus;
      branchId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;
    if (params.branchId) where.branchId = params.branchId;
    if (params.startDate && params.endDate) {
      where.expenseDate = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    const [items, total, agg] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          category: true,
          supplier: true,
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amountInPaise: true },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalExpenseAmountInPaise: agg._sum.amountInPaise || 0,
    };
  }

  async createExpense(
    tenantId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateExpenseDto,
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Gym branch not found for this account');

    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, tenantId },
    });
    if (!category) throw new NotFoundException('Expense category not found');

    // Auto-approve if created by Owner or SuperAdmin, otherwise PENDING_APPROVAL
    const isOwner = userRole === UserRole.GYM_OWNER || userRole === UserRole.SUPER_ADMIN;
    const status = isOwner ? ExpenseStatus.APPROVED : ExpenseStatus.PENDING_APPROVAL;
    const approvedByUserId = isOwner ? userId : null;
    const approvedAt = isOwner ? new Date() : null;

    let cashRegisterSessionId: string | null = null;

    return this.prisma.$transaction(async (tx) => {
      // If paid in cash and auto-approved, link to active drawer and increment cashPaidOut
      if (dto.paymentMethod === ExpensePaymentMethod.CASH && isOwner) {
        const activeRegister = await tx.cashRegisterSession.findFirst({
          where: { tenantId, branchId: dto.branchId, status: RegisterSessionStatus.OPEN },
        });
        if (activeRegister) {
          cashRegisterSessionId = activeRegister.id;
          await tx.cashRegisterSession.update({
            where: { id: activeRegister.id },
            data: {
              cashPaidOutInPaise: { increment: dto.amountInPaise },
              expectedClosingPaise: { decrement: dto.amountInPaise },
            },
          });
        }
      }

      return tx.expense.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId || null,
          expenseDate: new Date(dto.expenseDate),
          amountInPaise: dto.amountInPaise,
          paymentMethod: dto.paymentMethod,
          payeeName: dto.payeeName.trim(),
          description: dto.description.trim(),
          receiptDocumentUrl: dto.receiptDocumentUrl?.trim() || null,
          status,
          cashRegisterSessionId,
          approvedByUserId,
          approvedAt,
          notes: dto.notes?.trim() || null,
        },
        include: {
          category: true,
          supplier: true,
        },
      });
    });
  }

  async approveExpense(
    tenantId: string,
    expenseId: string,
    userId: string,
    dto: ApproveExpenseDto,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tenantId },
    });
    if (!expense) throw new NotFoundException('Expense entry not found');

    if (expense.status !== ExpenseStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Expense has already been reviewed (status: ${expense.status}).`);
    }

    const status = dto.approved ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED;

    return this.prisma.$transaction(async (tx) => {
      let cashRegisterSessionId = expense.cashRegisterSessionId;

      // If approved and payment was CASH, link to current open drawer session
      if (dto.approved && expense.paymentMethod === ExpensePaymentMethod.CASH) {
        const activeRegister = await tx.cashRegisterSession.findFirst({
          where: { tenantId, branchId: expense.branchId, status: RegisterSessionStatus.OPEN },
        });
        if (activeRegister) {
          cashRegisterSessionId = activeRegister.id;
          await tx.cashRegisterSession.update({
            where: { id: activeRegister.id },
            data: {
              cashPaidOutInPaise: { increment: expense.amountInPaise },
              expectedClosingPaise: { decrement: expense.amountInPaise },
            },
          });
        }
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          status,
          approvedByUserId: userId,
          approvedAt: new Date(),
          cashRegisterSessionId,
          notes: dto.notes ? `${expense.notes || ''}\n${dto.notes.trim()}`.trim() : expense.notes,
        },
        include: { category: true },
      });
    });
  }
}
