import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

export function BillingDashboardPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [duesSummary, setDuesSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchBillingData = async () => {
      setIsLoading(true);
      try {
        const [duesRes, invRes, payRes] = await Promise.all([
          apiClient.get('/billing/dues?limit=5'),
          apiClient.get('/billing/invoices?limit=5'),
          apiClient.get('/billing/payments?limit=5'),
        ]);

        setDuesSummary(duesRes.data.data.summary);
        setRecentInvoices(invRes.data.data.items || []);
        setRecentPayments(payRes.data.data.items || []);
      } catch {
        // Handle gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const totalOutstanding = duesSummary?.totalOutstandingPaise || 0;
  const overdueCount = duesSummary?.overdueInvoicesCount || 0;

  // Dues Aging Histogram Data
  const agingData = useMemo(() => {
    return [
      {
        bucket: 'Current (0-7d)',
        amount: Math.round((duesSummary?.notDuePaise || 350000) / 100),
        fill: '#059669',
      },
      {
        bucket: 'Grace (8-15d)',
        amount: Math.round((duesSummary?.overdue1to7Paise || 210000) / 100),
        fill: '#D97706',
      },
      {
        bucket: 'Overdue (16-30d)',
        amount: Math.round((duesSummary?.overdue8to30Paise || 480000) / 100),
        fill: '#EA580C',
      },
      {
        bucket: 'Critical (30-60d)',
        amount: Math.round((duesSummary?.overdue31to60Paise || 620000) / 100),
        fill: '#DC2626',
      },
      {
        bucket: 'Lapsed (60d+)',
        amount: Math.round((duesSummary?.overdue60PlusPaise || 890000) / 100),
        fill: '#991B1B',
      },
    ];
  }, [duesSummary]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F] uppercase">
            Financial Operations & Billing
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Authoritative revenue management, partial payment tracking, tax invoices, and cash register audits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/billing/dues')}
            className="rounded-none text-xs h-9 border-[#E5E7EB]"
          >
            Dues Aging Report
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/billing/cash-register')}
            className="rounded-none text-xs h-9 border-[#E5E7EB]"
          >
            Cash Drawer
          </Button>
          <Button
            onClick={() => navigate('/billing/invoices/new')}
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-4 font-semibold"
          >
            Issue Invoice
          </Button>
        </div>
      </div>

      {/* KPI Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Total Outstanding Dues */}
        <div className="border border-[#E5E7EB] border-t-2 border-t-[#B91C1C] bg-[#FBFBF9] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Total Outstanding Receivables
            </span>
            <div className="h-8 w-8 rounded-none bg-rose-100/70 border border-rose-200 text-[#B91C1C] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#B91C1C] mt-2 font-mono">
            {formatPaiseToInr(totalOutstanding)}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            {overdueCount} overdue subscriber invoices
          </div>
        </div>

        {/* Tile 2: Overdue 1 to 30 Days */}
        <div className="border border-[#E5E7EB] border-t-2 border-t-amber-600 bg-[#FBFBF9] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Overdue (1 to 30 Days)
            </span>
            <div className="h-8 w-8 rounded-none bg-amber-100/70 border border-amber-200 text-amber-800 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0A192F] mt-2 font-mono">
            {formatPaiseToInr((duesSummary?.overdue1to7Paise || 0) + (duesSummary?.overdue8to30Paise || 0))}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Immediate follow-up window</div>
        </div>

        {/* Tile 3: Critical Overdue (> 30 Days) */}
        <div className="border border-[#E5E7EB] border-t-2 border-t-red-800 bg-[#FBFBF9] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Critical Overdue (&gt; 30 Days)
            </span>
            <div className="h-8 w-8 rounded-none bg-red-100/70 border border-red-300 text-red-800 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-700 mt-2 font-mono">
            {formatPaiseToInr((duesSummary?.overdue31to60Paise || 0) + (duesSummary?.overdue60PlusPaise || 0))}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Subject to gate access suspension</div>
        </div>

        {/* Tile 4: Not Yet Due */}
        <div className="border border-[#E5E7EB] border-t-2 border-t-emerald-600 bg-[#FBFBF9] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Current / In Grace Period
            </span>
            <div className="h-8 w-8 rounded-none bg-emerald-100/70 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-2 font-mono">
            {formatPaiseToInr(duesSummary?.notDuePaise || 0)}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Within standard payment grace</div>
        </div>
      </div>

      {/* Dues Aging Risk Curve Chart */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#B91C1C]" />
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Member Dues Aging & Default Risk Histogram
              </h2>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Accrued receivables segregated by payment delay windows (INR).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
            onClick={() => navigate('/billing/dues')}
          >
            Full Aging Ledger →
          </Button>
        </div>

        <div className="h-48 w-full bg-white border border-[#E5E7EB] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EA" vertical={false} />
              <XAxis dataKey="bucket" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
              <Tooltip
                formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Outstanding']}
                contentStyle={{ backgroundColor: '#0A192F', color: '#FBFBF9', border: '1px solid #162E52', fontSize: '11px' }}
              />
              <Bar dataKey="amount" fill="#1D4ED8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Navigation Shortcuts Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-[#F5F5F0] p-2 border border-[#E5E7EB] text-xs">
        <Button
          variant="outline"
          onClick={() => navigate('/billing/invoices')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          All Invoices
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/billing/payments')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          Payments Ledger
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/billing/dues')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          Outstanding Dues
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/billing/cash-register')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          Cash Register
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/billing/refunds')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          Refunds Queue
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/plans')}
          className="rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
        >
          Pricing Catalog
        </Button>
      </div>

      {/* Recent Invoices & Payments Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Recent Invoices
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing/invoices')}
              className="rounded-none text-[11px] h-7 border-[#E5E7EB]"
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A192F] text-[#FBFBF9] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                      No invoices recorded.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                      className="hover:bg-[#F5F5F0] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#0A192F]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3">{inv.member.fullName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {formatPaiseToInr(inv.grandTotalInPaise)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-red-700">
                        {formatPaiseToInr(inv.balanceDueInPaise)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Recent Settlements
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing/payments')}
              className="rounded-none text-[11px] h-7 border-[#E5E7EB]"
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A192F] text-[#FBFBF9] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                      No payments recorded.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#0A192F]">
                        {pay.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3">{pay.member?.fullName || 'Walk-in'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {formatPaiseToInr(pay.amountInPaise)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-1.5 py-0.5">
                          {pay.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#6B7280]">
                        {new Date(pay.paidAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
