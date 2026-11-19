import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const totalOutstanding = duesSummary?.totalOutstandingPaise || 0;
  const overdueCount = duesSummary?.overdueInvoicesCount || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tile 1: Total Outstanding Dues */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Total Outstanding Receivables
          </div>
          <div className="text-2xl font-bold text-[#B91C1C] mt-2 font-mono">
            {formatPaiseToInr(totalOutstanding)}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            {overdueCount} overdue subscriber invoices
          </div>
        </div>

        {/* Tile 2: Overdue 1 to 30 Days */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Overdue (1 to 30 Days)
          </div>
          <div className="text-2xl font-bold text-[#0A192F] mt-2 font-mono">
            {formatPaiseToInr((duesSummary?.overdue1to7Paise || 0) + (duesSummary?.overdue8to30Paise || 0))}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Immediate follow-up window</div>
        </div>

        {/* Tile 3: Critical Overdue (> 30 Days) */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Critical Overdue (&gt; 30 Days)
          </div>
          <div className="text-2xl font-bold text-red-700 mt-2 font-mono">
            {formatPaiseToInr((duesSummary?.overdue31to60Paise || 0) + (duesSummary?.overdue60PlusPaise || 0))}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Subject to gate access suspension</div>
        </div>

        {/* Tile 4: Not Yet Due */}
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Current / Not Yet Due
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-2 font-mono">
            {formatPaiseToInr(duesSummary?.notDuePaise || 0)}
          </div>
          <div className="text-xs text-[#6B7280] mt-1">Within standard payment grace</div>
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
              <thead className="bg-[#F5F5F0] text-[#4B5563] text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
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
                      className="hover:bg-[#F5F5F0] cursor-pointer"
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
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-none ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {inv.status}
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
              Recent Collections
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
              <thead className="bg-[#F5F5F0] text-[#4B5563] text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Payment #</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                      No collections recorded.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F5F5F0]">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#0A192F]">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2.5 px-3">{p.member.fullName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                        {formatPaiseToInr(p.amountInPaise)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#4B5563]">{p.method}</td>
                      <td className="py-2.5 px-3">
                        {p.receipt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/billing/receipts/${p.receipt.id}`)}
                            className="rounded-none text-[10px] h-6 px-2 border-[#E5E7EB]"
                          >
                            Receipt
                          </Button>
                        ) : (
                          '-'
                        )}
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
