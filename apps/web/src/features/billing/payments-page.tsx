import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { PaymentMethodType } from '@fitnexa/shared';
import { formatPaiseToInr } from '../../lib/utils';

export function PaymentsPage() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (selectedMethod) params.append('method', selectedMethod);

      const res = await apiClient.get(`/billing/payments?${params.toString()}`);
      const payload = res.data?.data || res.data;
      const items = payload?.items || payload?.data || [];
      const meta = payload?.meta || {};
      setPayments(Array.isArray(items) ? items : []);
      setTotalPages(meta.totalPages || 1);
      setTotalCount(meta.total || items.length || 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, selectedMethod]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case PaymentMethodType.UPI:
        return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
      case PaymentMethodType.CASH:
        return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
      case PaymentMethodType.CARD_MANUAL:
        return 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]';
      case PaymentMethodType.BANK_TRANSFER:
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      case PaymentMethodType.CHEQUE:
        return 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
      default:
        return 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Payments & Collections</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative transactional ledger of all payments collected across branches and methods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#0A192F] text-[#0A192F] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/billing/invoices')}
          >
            Collect Against Invoice
          </Button>
          <Button
            variant="primary"
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none"
            onClick={() => navigate('/billing')}
          >
            Billing Dashboard
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#0A192F] uppercase tracking-wider">Method Filter:</span>
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
          >
            <option value="">All Payment Methods</option>
            <option value={PaymentMethodType.UPI}>UPI / QR</option>
            <option value={PaymentMethodType.CASH}>Cash Drawer</option>
            <option value={PaymentMethodType.CARD_MANUAL}>Credit / Debit Card</option>
            <option value={PaymentMethodType.BANK_TRANSFER}>Bank Transfer</option>
            <option value={PaymentMethodType.CHEQUE}>Cheque</option>
          </select>
        </div>

        <div className="text-xs font-mono text-[#6B7280]">
          Total Collections Recorded: <span className="font-semibold text-[#0A192F]">{totalCount}</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0A192F]">No payments recorded</p>
            <p className="text-xs text-[#6B7280]">
              Collections recorded against membership invoices or down payments will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4 text-right">Amount (â‚¹)</th>
                  <th className="py-3 px-4">Received By</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {payments.map((p) => {
                  const receiptId = p.receipt?.id;
                  const receiptNumber = p.receipt?.receiptNumber;

                  return (
                    <tr key={p.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3 px-4 text-[#4B5563]">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        <span className="text-[10px] text-[#9CA3AF]">
                          {new Date(p.paymentDate).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#111827]">
                          {p.member?.firstName} {p.member?.lastName}
                        </div>
                        <div className="text-[10px] font-mono text-[#6B7280]">
                          {p.member?.memberCode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider rounded-none ${getMethodBadge(
                            p.method,
                          )}`}
                        >
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#4B5563]">
                        {p.referenceNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                        {formatPaiseToInr(p.amountInPaise)}
                      </td>
                      <td className="py-3 px-4 text-[#4B5563]">
                        {p.receivedBy?.fullName || 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {receiptId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#0A192F] hover:bg-[#E5E7EB] rounded-none font-mono"
                            onClick={() => navigate(`/billing/receipts/${receiptId}`)}
                          >
                            {receiptNumber || 'View'}
                          </Button>
                        ) : (
                          <span className="text-[#9CA3AF] text-[10px] font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between bg-[#F5F5F0]">
            <span className="text-xs text-[#6B7280]">
              Page <span className="font-semibold text-[#0A192F]">{page}</span> of{' '}
              <span className="font-semibold text-[#0A192F]">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 rounded-none border-[#E5E7EB] text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-none border-[#E5E7EB] text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


