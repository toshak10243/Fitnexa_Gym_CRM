import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DashboardMetricsDto } from '@fitnexa/shared';

@Injectable()
export class DashboardService {
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

  async getExecutiveDashboard(
    tenantId: string,
    branchId?: string,
  ): Promise<DashboardMetricsDto> {
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
        where: { tenantId, status: 'ACTIVE', ...branchFilter },
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
      todayCheckIns,
      currentOccupancy,
      staffOnDuty,
    ] = await Promise.all([
      this.prisma.memberAttendance.count({
        where: {
          tenantId,
          ...branchFilter,
          direction: 'CHECK_IN',
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
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
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { grandTotalInPaise: true },
      }),
      // Collections this month
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['RECORDED', 'VERIFIED'] },
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // Collections today
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['RECORDED', 'VERIFIED'] },
          createdAt: { gte: startOfDay, lte: endOfDay },
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
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amountInPaise: true },
      }),
      // POS retail sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          ...branchFilter,
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
          notes: { contains: 'POS' },
          createdAt: { gte: startOfMonth, lte: endOfDay },
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
          scheduledAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // PT sessions today completed
      this.prisma.trainingSession.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          scheduledAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    // Calculate low stock items count from stock movements
    let lowStockCount = 0;
    for (const prod of activeProducts) {
      const stockAgg = await this.prisma.stockMovement.aggregate({
        where: { tenantId, productId: prod.id },
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
        peakHour: '06:00 - 09:00',
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
