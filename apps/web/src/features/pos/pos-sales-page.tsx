import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

export function PosSalesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/pos/sales?page=${page}&limit=50`);
      setSales(res.data.data.items || []);
      setTotal(res.data.data.total || 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Point of Sale Transactions
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative sales register, retail invoices, itemized tax breakdowns, and customer purchases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory')}
          >
            ← Inventory
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/pos')}
          >
            Open POS Counter →
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Transaction / Time</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax (GST)</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#6B7280]">
                    No POS sales recorded yet. Click &apos;Open POS Counter&apos; to process your first sale.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const invoice = sale.invoice || {};
                  return (
                    <tr key={sale.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {new Date(sale.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                        {invoice.invoiceNumber || sale.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-[#0A192F]">
                        {sale.member ? (
                          <span className="font-bold">{sale.member.fullName}</span>
                        ) : (
                          <span>{sale.walkInCustomerName || 'Walk-in Customer'}</span>
                        )}
                        {sale.walkInCustomerPhone && (
                          <div className="font-mono text-[10px] text-[#6B7280]">
                            {sale.walkInCustomerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border border-[#E5E7EB] bg-white text-[#0A192F]">
                          {sale.paymentMethod || 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#6B7280]">
                        {formatPaiseToInr(invoice.subtotalInPaise || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#6B7280]">
                        {formatPaiseToInr(invoice.taxAmountInPaise || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                        {formatPaiseToInr(invoice.grandTotalInPaise || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/pos/sales/${sale.id}`)}
                          className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
                        >
                          View Details →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-bold text-[#0A192F]">{sales.length}</span> of{' '}
            <span className="font-bold text-[#0A192F]">{total}</span> sales
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Previous
            </Button>
            <span className="font-mono font-medium text-[#0A192F]">Page {page}</span>
            <Button
              variant="outline"
              disabled={sales.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
