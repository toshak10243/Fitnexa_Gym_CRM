import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export function StockMovementsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/inventory/movements?page=${page}&limit=50`);
      const payload = res.data?.data ?? res.data;
      setMovements(payload?.items || []);
      setTotal(payload?.total || 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Stock Movement Ledger
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Immutable audit record of all physical inventory changes, purchases, sales, and corrections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory')}
          >
            ← Inventory Overview
          </Button>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/products')}
          >
            Products
          </Button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Delta</th>
                <th className="py-3 px-4 text-right">Post Balance</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {new Date(m.timestamp || m.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0A192F]">
                        <div>{m.product?.name || 'Unknown Product'}</div>
                        <div className="font-mono text-[10px] text-[#6B7280]">
                          SKU: {m.product?.sku || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border border-[#E5E7EB] bg-white text-[#0A192F]">
                          {(m.movementType || m.type || 'UNKNOWN').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-[#B91C1C]'
                        }`}
                      >
                        {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-[#0A192F]">
                        {m.postBalance ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {m.referenceType ? `${m.referenceType}: ${m.referenceId?.slice(0, 8) || ''}` : 'Direct'}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                        {m.notes || m.reason || 'Standard system movement'}
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
            Showing <span className="font-bold text-[#0A192F]">{movements.length}</span> of{' '}
            <span className="font-bold text-[#0A192F]">{total}</span> movements
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
              disabled={movements.length < 50}
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


