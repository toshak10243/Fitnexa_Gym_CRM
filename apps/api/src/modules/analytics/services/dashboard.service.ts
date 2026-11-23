import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DashboardMetricsDto } from '@fitnexa/shared';

@Injectable()
export class DashboardService {
  async getMasterDashboard(tenantId: string, branchId: string | undefined, from: string, to: string) {
    if (!tenantId || tenantId === 'system-platform') {
      return {
        updatedAt: new Date().toISOString(),
        members: 0,
        products: 0,
        purchases: 0,
        devices: 0,
        staff: 0,
        collections: 0,
        approvedExpenses: 0,
        pendingExpenses: 0,
        posSales: 0,
        dues: 0,
        daily: [],
        categories: [],
        methods: [],
        leads: [],
        sessions: [],
      };
    }
    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(`${to}T23:59:59.999+05:30`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || end.getTime() - start.getTime() > 93 * 86400000) {
      throw new BadRequestException('Choose a valid date range of up to 93 days.');
    }
    if (branchId && !await this.prisma.branch.findFirst({ where: { id: branchId, tenantId }, select: { id: true } })) throw new BadRequestException('Invalid branch');
    const scope = { tenantId, ...(branchId ? { branchId } : {}) };
    const range = { gte: start, lte: end };
    const [members, payments, expenses, leads, visits, sessions, products, purchases, devices, staff, invoices] = await Promise.all([
      this.prisma.member.count({ where: { ...scope, NOT: { memberCode: 'MEM-WALKIN-RETAIL' } } }),
      this.prisma.payment.findMany({ where: { ...scope, paymentDate: range, status: { in: ['RECORDED', 'VERIFIED'] } }, select: { paymentDate: true, amountInPaise: true, method: true } }),
      this.prisma.expense.findMany({ where: { ...scope, expenseDate: range }, select: { expenseDate: true, amountInPaise: true, status: true, category: { select: { name: true } } } }),
      this.prisma.lead.groupBy({ by: ['stage'], where: { ...scope, createdAt: range }, _count: true }),
      this.prisma.memberAttendance.findMany({ where: { ...scope, timestamp: range, direction: 'CHECK_IN' }, select: { timestamp: true } }),
      this.prisma.trainingSession.groupBy({ by: ['status'], where: { ...scope, scheduledAt: range }, _count: true }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.purchaseOrder.count({ where: { ...scope, createdAt: range } }),
      this.prisma.device.count({ where: scope }),
      this.prisma.user.count({ where: scope }),
      this.prisma.invoice.findMany({ where: { ...scope, invoiceDate: range, status: { not: 'VOID' } }, select: { invoiceNumber: true, grandTotalInPaise: true, balanceDueInPaise: true } }),
    ]);
    const daily = new Map<string, { date: string; collections: number; expenses: number; visits: number }>();
    const key = (date: Date) => new Date(date.getTime() + 19800000).toISOString().slice(0, 10);
    for (let date = new Date(start); date <= end; date = new Date(date.getTime() + 86400000)) { const day = key(date); daily.set(day, { date: day, collections: 0, expenses: 0, visits: 0 }); }
    const categories: Record<string, number> = {};
    const methods: Record<string, number> = {};
    payments.forEach(p => { const row = daily.get(key(p.paymentDate)); if (row) row.collections += p.amountInPaise; methods[p.method] = (methods[p.method] || 0) + p.amountInPaise; });
    expenses.filter(e => e.status === 'APPROVED').forEach(e => { const row = daily.get(key(e.expenseDate)); if (row) row.expenses += e.amountInPaise; categories[e.category.name] = (categories[e.category.name] || 0) + e.amountInPaise; });
    visits.forEach(v => { const row = daily.get(key(v.timestamp)); if (row) row.visits++; });
    return { updatedAt: new Date().toISOString(), members, products, purchases, devices, staff, collections: payments.reduce((s, p) => s + p.amountInPaise, 0), approvedExpenses: expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.amountInPaise, 0), pendingExpenses: expenses.filter(e => e.status === 'PENDING_APPROVAL').reduce((s, e) => s + e.amountInPaise, 0), posSales: invoices.filter(i => i.invoiceNumber.startsWith('INV-POS')).reduce((s, i) => s + i.grandTotalInPaise, 0), dues: invoices.reduce((s, i) => s + i.balanceDueInPaise, 0), daily: [...daily.values()], categories: Object.entries(categories).map(([name, amount]) => ({ name, amount })), methods: Object.entries(methods).map(([name, amount]) => ({ name, amount })), leads: leads.map(l => ({ name: l.stage, count: l._count })), sessions: sessions.map(s => ({ name: s.status, count: s._count })) };
  }
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Helper to get IST boundaries in UTC
   */
  private getIstBoundaries() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // +05:30
    const istNow = new Date(now.getTime() + istOffset);

    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const day = istNow.getUTCDate();

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0) - istOffset);
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - istOffset);
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0) - istOffset);

    // 7 days and 30 days ahead
    const in7Days = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(startOfDay.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { now, startOfDay, endOfDay, startOfMonth, in7Days, in30Days };
  }

  private getEmptyDashboard(): DashboardMetricsDto {
    return {
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      memberships: {
        totalActiveMembers: 0,
        newRegistrationsToday: 0,
        newRegistrationsThisMonth: 0,
        activeMemberships: 0,
        expiringIn7Days: 0,
        expiringIn30Days: 0,
        expiredMemberships: 0,
      },
      attendance: {
        todayCheckIns: 0,
        currentOccupancy: 0,
        peakHour: 'None',
        staffOnDuty: 0,
      },
      financials: {
        grossInvoicedRevenuePaise: 0,
        grossCollectionsPaise: 0,
        todayCollectionsPaise: 0,
        outstandingDuesPaise: 0,
        refundsPaidPaise: 0,
        operatingExpensesPaise: 0,
        netOperationalCashPaise: 0,
        posRetailSalesPaise: 0,
      },
      operations: {
        lowStockItemsCount: 0,
        newLeadsThisMonth: 0,
        leadConversionRatePercent: 0,
        scheduledPtSessionsToday: 0,
        completedPtSessionsToday: 0,
      },
    };
  }

  async getExecutiveDashboard(
    tenantId: string,
    branchId?: string,
  ): Promise<DashboardMetricsDto> {
    if (!tenantId || tenantId === 'system-platform') {
      return this.getEmptyDashboard();
    }
    const cacheKey = `cache:tenant:${tenantId}:dash:${branchId || 'all'}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (err: any) {
      this.logger.warn(`Redis cache get failed: ${err.message}`);
    }

    const { now, startOfDay, endOfDay, startOfMonth, in7Days, in30Days } = this.getIstBoundaries();

    // Branch filter condition
    const branchFilter = branchId ? { branchId } : {};

    // 1. Memberships KPIs
    const [
      totalActiveMembers,
      newRegistrationsToday,
      newRegistrationsThisMonth,
      activeMemberships,
      expiringIn7Days,
      expiringIn30Days,
      expiredMemberships,
    ] = await Promise.all([
      this.prisma.member.count({
        where: { tenantId, status: 'ACTIVE', NOT: { memberCode: 'MEM-WALKIN-RETAIL' }, ...branchFilter },
      }),
      this.prisma.member.count({
        where: {
          tenantId,
          ...branchFilter,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.member.count({
        where: {
          tenantId,
          ...branchFilter,
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
      }),
      this.prisma.memberMembership.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          member: branchFilter,
        },
      }),
      this.prisma.memberMembership.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          endDate: { gte: now, lte: in7Days },
          member: branchFilter,
        },
      }),
      this.prisma.memberMembership.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          endDate: { gte: now, lte: in30Days },
          member: branchFilter,
        },
      }),
      this.prisma.memberMembership.count({
        where: {
          tenantId,
          status: 'EXPIRED',
          member: branchFilter,
        },
      }),
    ]);

    // 2. Attendance & Live Occupancy KPIs
    const [
      todayCheckInEvents,
      currentOccupancy,
      staffOnDuty,
    ] = await Promise.all([
      this.prisma.memberAttendance.findMany({
        where: {
          tenantId,
          ...branchFilter,
          direction: 'CHECK_IN',
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
        select: { timestamp: true },
      }),
      this.prisma.attendanceSession.count({
        where: {
          tenantId,
          ...branchFilter,
          status: 'ACTIVE',
          checkOutTime: null,
        },
      }),
      this.prisma.staffAttendance.count({
        where: {
          tenantId,
          ...branchFilter,
          status: 'ACTIVE',
          shiftDate: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const todayCheckIns = todayCheckInEvents.length;
    const hourlyCheckIns = new Map<number, number>();
    for (const event of todayCheckInEvents) {
      const hour = new Date(event.timestamp.getTime() + 19800000).getUTCHours();
      hourlyCheckIns.set(hour, (hourlyCheckIns.get(hour) || 0) + 1);
    }
    const busiestHour = [...hourlyCheckIns.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    const peakHour = busiestHour === undefined ? 'None' : `${String(busiestHour).padStart(2, '0')}:00 - ${String((busiestHour + 1) % 24).padStart(2, '0')}:00`;

    // 3. Financials KPIs
    const [
      invoicesThisMonth,
      collectionsAll,
      collectionsToday,
      activeInvoicesForDues,
      refundsProcessed,
      expensesThisMonth,
      posInvoices,
    ] = await Promise.all([
      // Gross Invoiced Revenue (this month)
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['PAID', 'PARTIALLY_PAID', 'ISSUED'] },
          invoiceDate: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { grandTotalInPaise: true },
      }),
      // Collections this month
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['RECORDED', 'VERIFIED'] },
          paymentDate: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // Collections today
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['RECORDED', 'VERIFIED'] },
          paymentDate: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // Outstanding dues
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        },
        select: {
          grandTotalInPaise: true,
          paidAmountInPaise: true,
        },
      }),
      // Processed refunds this month
      this.prisma.refund.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: 'PROCESSED',
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // Operating expenses this month
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: 'APPROVED',
          expenseDate: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // POS retail sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
          invoiceNumber: { startsWith: 'INV-POS' },
          invoiceDate: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { grandTotalInPaise: true },
      }),
    ]);

    // Outstanding Dues calculation
    const outstandingDuesPaise = activeInvoicesForDues.reduce(
      (sum, inv) => sum + Math.max(0, inv.grandTotalInPaise - inv.paidAmountInPaise),
      0,
    );

    const grossInvoicedRevenuePaise = invoicesThisMonth._sum.grandTotalInPaise || 0;
    const grossCollectionsPaise = collectionsAll._sum.amountInPaise || 0;
    const todayCollectionsPaise = collectionsToday._sum.amountInPaise || 0;
    const refundsPaidPaise = refundsProcessed._sum.amountInPaise || 0;
    const operatingExpensesPaise = expensesThisMonth._sum.amountInPaise || 0;
    const netOperationalCashPaise = grossCollectionsPaise - refundsPaidPaise - operatingExpensesPaise;
    const posRetailSalesPaise = posInvoices._sum.grandTotalInPaise || 0;

    // 4. Operations KPIs
    const [
      activeProducts,
      newLeadsMonth,
      convertedLeadsMonth,
      scheduledSessionsToday,
      completedSessionsToday,
    ] = await Promise.all([
      // Count products with currentStock <= reorderThreshold
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, reorderThreshold: true },
      }),
      // New leads this month
      this.prisma.lead.count({
        where: {
          tenantId,
          ...branchFilter,
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
      }),
      // Converted leads this month
      this.prisma.lead.count({
        where: {
          tenantId,
          ...branchFilter,
          convertedMemberId: { not: null },
          updatedAt: { gte: startOfMonth, lte: endOfDay },
        },
      }),
      // PT sessions today scheduled
      this.prisma.trainingSession.count({
        where: {
          tenantId,
          status: 'SCHEDULED',
          ...branchFilter,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // PT sessions today completed
      this.prisma.trainingSession.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          ...branchFilter,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    // Calculate low stock items count from stock movements
    let lowStockCount = 0;
    for (const prod of activeProducts) {
      const stockAgg = await this.prisma.stockMovement.aggregate({
        where: { tenantId, ...branchFilter, productId: prod.id },
        _sum: { quantityDelta: true },
      });
      const balance = stockAgg._sum.quantityDelta || 0;
      if (balance <= prod.reorderThreshold) {
        lowStockCount++;
      }
    }

    const leadConversionRatePercent =
      newLeadsMonth > 0 ? Math.round((convertedLeadsMonth / newLeadsMonth) * 1000) / 10 : 0;

    const result: DashboardMetricsDto = {
      generatedAt: now.toISOString(),
      timezone: 'Asia/Kolkata',
      memberships: {
        totalActiveMembers,
        newRegistrationsToday,
        newRegistrationsThisMonth,
        activeMemberships,
        expiringIn7Days,
        expiringIn30Days,
        expiredMemberships,
      },
      attendance: {
        todayCheckIns,
        currentOccupancy,
        peakHour,
        staffOnDuty,
      },
      financials: {
        grossInvoicedRevenuePaise,
        grossCollectionsPaise,
        todayCollectionsPaise,
        outstandingDuesPaise,
        refundsPaidPaise,
        operatingExpensesPaise,
        netOperationalCashPaise,
        posRetailSalesPaise,
      },
      operations: {
        lowStockItemsCount: lowStockCount,
        newLeadsThisMonth: newLeadsMonth,
        leadConversionRatePercent,
        scheduledPtSessionsToday: scheduledSessionsToday,
        completedPtSessionsToday: completedSessionsToday,
      },
    };

    // Cache the metric snapshot
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);
    } catch {
      // Handled gracefully
    }

    return result;
  }
}
