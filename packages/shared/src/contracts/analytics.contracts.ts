export interface DashboardMembershipsKpi {
  totalActiveMembers: number;
  newRegistrationsToday: number;
  newRegistrationsThisMonth: number;
  activeMemberships: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredMemberships: number;
}

export interface DashboardAttendanceKpi {
  todayCheckIns: number;
  currentOccupancy: number;
  peakHour: string;
  staffOnDuty: number;
}

export interface DashboardFinancialsKpi {
  grossInvoicedRevenuePaise: number;
  grossCollectionsPaise: number;
  todayCollectionsPaise: number;
  outstandingDuesPaise: number;
  refundsPaidPaise: number;
  operatingExpensesPaise: number;
  netOperationalCashPaise: number;
  posRetailSalesPaise: number;
}

export interface DashboardOperationsKpi {
  lowStockItemsCount: number;
  newLeadsThisMonth: number;
  leadConversionRatePercent: number;
  scheduledPtSessionsToday: number;
  completedPtSessionsToday: number;
}

export interface DashboardMetricsDto {
  generatedAt: string;
  timezone: string;
  memberships: DashboardMembershipsKpi;
  attendance: DashboardAttendanceKpi;
  financials: DashboardFinancialsKpi;
  operations: DashboardOperationsKpi;
}

export enum ReportType {
  MEMBERSHIP_SUMMARY = 'membership-summary',
  FINANCIAL_COLLECTIONS = 'financial-collections',
  ATTENDANCE_PATTERNS = 'attendance-patterns',
  INVENTORY_VELOCITY = 'inventory-velocity',
  TRAINER_PRODUCTIVITY = 'trainer-productivity',
  LEAD_CONVERSIONS = 'lead-conversions',
}

export interface ReportQueryDto {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReportResponseDto<T = any> {
  reportType: ReportType;
  generatedAt: string;
  timezone: string;
  startDate: string;
  endDate: string;
  branchId?: string;
  totalRecords: number;
  summary: Record<string, any>;
  records: T[];
}
