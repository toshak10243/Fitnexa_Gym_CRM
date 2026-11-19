import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ReportType, ReportQueryDto, ReportResponseDto } from '@fitnexa/shared';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(
    tenantId: string,
    reportType: string,
    query: ReportQueryDto,
  ): Promise<ReportResponseDto> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 50;
    const skip = (page - 1) * limit;

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const branchFilter = query.branchId ? { branchId: query.branchId } : {};

    switch (reportType) {
      case ReportType.MEMBERSHIP_SUMMARY:
        return this.generateMembershipReport(tenantId, branchFilter, startDate, endDate, skip, limit);
      case ReportType.FINANCIAL_COLLECTIONS:
        return this.generateFinancialReport(tenantId, branchFilter, startDate, endDate, skip, limit);
      case ReportType.ATTENDANCE_PATTERNS:
        return this.generateAttendanceReport(tenantId, branchFilter, startDate, endDate, skip, limit);
      case ReportType.INVENTORY_VELOCITY:
        return this.generateInventoryReport(tenantId, skip, limit);
      case ReportType.TRAINER_PRODUCTIVITY:
        return this.generateTrainerReport(tenantId, skip, limit);
      case ReportType.LEAD_CONVERSIONS:
        return this.generateLeadReport(tenantId, branchFilter, startDate, endDate, skip, limit);
      default:
        throw new BadRequestException(`Unsupported report type: ${reportType}`);
    }
  }

  private async generateMembershipReport(
    tenantId: string,
    branchFilter: any,
    startDate: Date,
    endDate: Date,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [totalActive, newRegistrations, expiredMembers, records, totalRecords] = await Promise.all([
      this.prisma.member.count({ where: { tenantId, status: 'ACTIVE', ...branchFilter } }),
      this.prisma.member.count({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.memberMembership.count({
        where: { tenantId, status: 'EXPIRED', member: branchFilter },
      }),
      this.prisma.memberMembership.findMany({
        where: {
          tenantId,
          member: branchFilter,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          member: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.memberMembership.count({
        where: {
          tenantId,
          member: branchFilter,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      reportType: ReportType.MEMBERSHIP_SUMMARY,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchFilter.branchId,
      totalRecords,
      summary: {
        totalActiveMembers: totalActive,
        newMembersInPeriod: newRegistrations,
        expiredMemberships: expiredMembers,
      },
      records: records.map((r) => ({
        id: r.id,
        memberCode: r.member?.memberCode,
        memberName: r.member?.fullName,
        phone: r.member?.phone,
        planName: r.plan?.name,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
      })),
    };
  }

  private async generateFinancialReport(
    tenantId: string,
    branchFilter: any,
    startDate: Date,
    endDate: Date,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [paymentsSum, upiSum, cashSum, records, totalRecords] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountInPaise: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, ...branchFilter, method: 'UPI', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountInPaise: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, ...branchFilter, method: 'CASH', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountInPaise: true },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
        include: {
          member: true,
          collector: true,
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      reportType: ReportType.FINANCIAL_COLLECTIONS,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchFilter.branchId,
      totalRecords,
      summary: {
        totalCollectedPaise: paymentsSum._sum.amountInPaise || 0,
        upiCollectedPaise: upiSum._sum.amountInPaise || 0,
        cashCollectedPaise: cashSum._sum.amountInPaise || 0,
      },
      records: records.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        paymentDate: p.paymentDate,
        memberName: p.member?.fullName || 'Walk-in Retail',
        amountInPaise: p.amountInPaise,
        method: p.method,
        collectorName: p.collector?.fullName,
      })),
    };
  }

  private async generateAttendanceReport(
    tenantId: string,
    branchFilter: any,
    startDate: Date,
    endDate: Date,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [totalCheckIns, records, totalRecords] = await Promise.all([
      this.prisma.memberAttendance.count({
        where: { tenantId, ...branchFilter, direction: 'CHECK_IN', timestamp: { gte: startDate, lte: endDate } },
      }),
      this.prisma.memberAttendance.findMany({
        where: { tenantId, ...branchFilter, timestamp: { gte: startDate, lte: endDate } },
        include: { member: true },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.memberAttendance.count({
        where: { tenantId, ...branchFilter, timestamp: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      reportType: ReportType.ATTENDANCE_PATTERNS,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchFilter.branchId,
      totalRecords,
      summary: {
        totalCheckIns,
      },
      records: records.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        memberName: a.member?.fullName,
        memberCode: a.member?.memberCode,
        direction: a.direction,
        source: a.source,
      })),
    };
  }

  private async generateInventoryReport(
    tenantId: string,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [totalProducts, products, totalRecords] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: { category: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    // Attach computed stock balance for each product
    const records = await Promise.all(
      products.map(async (p) => {
        const stockAgg = await this.prisma.stockMovement.aggregate({
          where: { tenantId, productId: p.id },
          _sum: { quantityDelta: true },
        });
        const currentStock = stockAgg._sum.quantityDelta || 0;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category?.name,
          currentStock,
          unit: p.unit,
          costPriceInPaise: p.costPriceInPaise,
          sellingPriceInPaise: p.sellingPriceInPaise,
          reorderThreshold: p.reorderThreshold,
        };
      }),
    );

    return {
      reportType: ReportType.INVENTORY_VELOCITY,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      totalRecords,
      summary: {
        totalActiveProducts: totalProducts,
      },
      records,
    };
  }

  private async generateTrainerReport(
    tenantId: string,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [records, totalRecords] = await Promise.all([
      this.prisma.trainerProfile.findMany({
        where: { tenantId, isActive: true },
        include: {
          user: true,
          assignments: true,
          sessions: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.trainerProfile.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      reportType: ReportType.TRAINER_PRODUCTIVITY,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      totalRecords,
      summary: {
        totalCoaches: totalRecords,
      },
      records: records.map((t) => ({
        id: t.id,
        trainerName: t.user?.fullName,
        email: t.user?.email,
        phone: t.user?.phone,
        activeClientsCount: t.assignments.length,
        commissionPercentage: t.commissionPercentage,
        totalSessionsConducted: t.sessions.filter((s) => s.status === 'COMPLETED').length,
      })),
    };
  }

  private async generateLeadReport(
    tenantId: string,
    branchFilter: any,
    startDate: Date,
    endDate: Date,
    skip: number,
    limit: number,
  ): Promise<ReportResponseDto> {
    const [totalLeads, convertedLeads, records, totalRecords] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } } }),
      this.prisma.lead.count({
        where: { tenantId, ...branchFilter, stage: 'CONVERTED', updatedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.lead.findMany({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({
        where: { tenantId, ...branchFilter, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      reportType: ReportType.LEAD_CONVERSIONS,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchFilter.branchId,
      totalRecords,
      summary: {
        totalLeads,
        convertedLeads,
        conversionRatePercent: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0,
      },
      records: records.map((l) => ({
        id: l.id,
        fullName: `${l.firstName} ${l.lastName}`.trim(),
        phone: l.phone,
        source: l.source,
        stage: l.stage,
        fitnessGoal: l.fitnessGoal,
        createdAt: l.createdAt,
      })),
    };
  }
}
