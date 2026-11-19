import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { DashboardMetricsDto } from '@fitnexa/shared';

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardMetricsDto | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let url = '/analytics/dashboard';
      if (selectedBranchId) {
        url += `?branchId=${selectedBranchId}`;
      }
      const [dashRes, branchRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/tenant/branches'),
      ]);
      setData(dashRes.data?.data || dashRes.data);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBranchId]);

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const { memberships, attendance, financials, operations } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Executive Management Dashboard
            </h1>
            <span className="bg-[#0A192F] text-white text-[10px] font-mono px-2 py-0.5 font-bold">
              IST (Asia/Kolkata)
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative operational telemetry, financial audit balances, gym occupancy, and member lifecycle metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs border border-[#E5E7EB] bg-white px-3 py-1.5 rounded-none font-medium text-[#0A192F] h-9"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] h-9"
            onClick={fetchDashboardData}
          >
            ↻ Refresh Metrics
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4 h-9"
            onClick={() => navigate('/reports')}
          >
            Analytics & Reports Center →
          </Button>
        </div>
      </div>

      {/* Primary KPI Ribbon: High-Level Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Members */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Active Enrolled Members
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight">
            {memberships.totalActiveMembers}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7280] flex items-center gap-1.5">
            <span className="font-bold text-emerald-700 font-mono">
              +{memberships.newRegistrationsToday} today
            </span>
            <span>·</span>
            <span>+{memberships.newRegistrationsThisMonth} this month</span>
          </div>
        </div>

        {/* Live Occupancy */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Current Floor Occupancy
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight flex items-center gap-2">
            <span>{attendance.currentOccupancy}</span>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
          </div>
          <div className="mt-1 text-[11px] text-[#6B7280]">
            {attendance.todayCheckIns} total check-ins today · Peak: {attendance.peakHour}
          </div>
        </div>

        {/* Today's Cash Collections */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Today&apos;s Collections (Cash / UPI / Card)
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight">
            {formatPaiseToInr(financials.todayCollectionsPaise)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7280]">
            Month-to-date: <span className="font-mono font-bold text-[#0A192F]">{formatPaiseToInr(financials.grossCollectionsPaise)}</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Outstanding Member Dues
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#B91C1C] tracking-tight">
            {formatPaiseToInr(financials.outstandingDuesPaise)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7280]">
            <button
              type="button"
              onClick={() => navigate('/billing/dues')}
              className="text-[#0A192F] font-bold hover:underline"
            >
              Inspect Dues Aging →
            </button>
          </div>
        </div>
      </div>

      {/* Quadrant 2: Financial Integrity & Cash Flow Statement */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
              Financial Performance & Operational Cash Flow
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Strict accounting segregation: Invoiced Revenue ≠ Liquid Cash Collections ≠ Net Operating Surplus.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
            onClick={() => navigate('/billing/invoices')}
          >
            Invoices Register
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-white border border-[#E5E7EB] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Gross Invoiced Revenue
            </span>
            <div className="font-mono text-base font-extrabold text-[#0A192F]">
              {formatPaiseToInr(financials.grossInvoicedRevenuePaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Accrued billing this month</p>
          </div>

          <div className="p-3 bg-white border border-[#E5E7EB] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Liquid Collections
            </span>
            <div className="font-mono text-base font-extrabold text-emerald-700">
              {formatPaiseToInr(financials.grossCollectionsPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Settled payments received</p>
          </div>

          <div className="p-3 bg-white border border-[#E5E7EB] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Operational Expenses
            </span>
            <div className="font-mono text-base font-extrabold text-[#B91C1C]">
              {formatPaiseToInr(financials.operatingExpensesPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Approved facility outflows</p>
          </div>

          <div className="p-3 bg-white border border-[#E5E7EB] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Net Cash Movement
            </span>
            <div className="font-mono text-base font-extrabold text-[#0A192F]">
              {formatPaiseToInr(financials.netOperationalCashPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Collections minus expenses & refunds</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
          <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280]">POS Retail Sales (Supplements & Merchandise):</span>
            <span className="font-mono font-bold text-[#0A192F]">
              {formatPaiseToInr(financials.posRetailSalesPaise)}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280]">Refunds Paid to Members:</span>
            <span className="font-mono font-bold text-[#B91C1C]">
              {formatPaiseToInr(financials.refundsPaidPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Quadrant 3 & 4: Operations & Membership Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Lifecycle & Retention Pipeline */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
              Membership Lifecycle & Renewals
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
              onClick={() => navigate('/members')}
            >
              Member Directory
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Active Ongoing Memberships:</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {memberships.activeMemberships}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-amber-200">
              <span className="text-amber-800 font-bold">
                Expiring within Next 7 Days:
              </span>
              <span className="font-mono font-bold text-amber-800">
                {memberships.expiringIn7Days}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Expiring within 30 Days:</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {memberships.expiringIn30Days}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-rose-200">
              <span className="text-rose-800 font-bold">
                Lapsed / Expired Memberships:
              </span>
              <span className="font-mono font-bold text-[#B91C1C]">
                {memberships.expiredMemberships}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Signals & Sales Velocity */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
              Operational Alerts & Sales CRM
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
              onClick={() => navigate('/leads')}
            >
              Leads Pipeline
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">New Inquiries (Month-to-Date):</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {operations.newLeadsThisMonth}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Lead to Member Conversion Rate:</span>
              <span className="font-mono font-bold text-emerald-700">
                {operations.leadConversionRatePercent}%
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Personal Training Sessions Today:</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {operations.completedPtSessionsToday} completed / {operations.scheduledPtSessionsToday} scheduled
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Inventory Low-Stock Warnings:</span>
              <span
                className={`font-mono font-bold ${
                  operations.lowStockItemsCount > 0 ? 'text-[#B91C1C]' : 'text-emerald-700'
                }`}
              >
                {operations.lowStockItemsCount} items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="bg-white border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
          Quick Front-Desk Actions:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/attendance/check-in')}
          >
            Check-In Counter
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/members/new')}
          >
            + Register Member
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/pos')}
          >
            Launch POS Counter
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/billing/invoices/new')}
          >
            Issue Invoice
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/expenses/new')}
          >
            Record Expense
          </Button>
        </div>
      </div>
    </div>
  );
}
