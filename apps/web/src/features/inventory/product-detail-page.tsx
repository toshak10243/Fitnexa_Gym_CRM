import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjLocationId, setAdjLocationId] = useState('');
  const [physicalCount, setPhysicalCount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, locRes, movRes] = await Promise.all([
        apiClient.get(`/inventory/products/${id}`),
        apiClient.get('/inventory/locations'),
        apiClient.get(`/inventory/movements?productId=${id}&limit=10`),
      ]);
      setProduct(prodRes.data.data);
      const locList = locRes.data.data || [];
      setLocations(locList);
      if (locList.length > 0) setAdjLocationId(locList[0].id);
      setMovements(movRes.data.data.items || []);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalCount || !adjReason.trim() || !adjLocationId) return;

    setIsSubmittingAdj(true);
    try {
      await apiClient.post('/inventory/adjustments', {
        branchId: locations[0]?.branchId || '',
        productId: id,
        locationId: adjLocationId,
        physicalQuantity: parseInt(physicalCount, 10),
        reason: adjReason.trim(),
      });
      setShowAdjModal(false);
      setPhysicalCount('');
      setAdjReason('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Adjustment failed');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20 text-xs text-[#6B7280]">
        Product not found.
      </div>
    );
  }

  const isLow = product.isLowStock;
  const unitProfit = product.sellingPriceInPaise - product.costPriceInPaise;
  const marginPct = product.costPriceInPaise > 0
    ? Math.round((unitProfit / product.costPriceInPaise) * 100)
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              {product.name}
            </h1>
            {isLow && (
              <span className="px-2 py-0.5 text-xs font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                Low Stock
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-[#6B7280] mt-1">
            SKU: {product.sku} | Barcode: {product.barcode || 'Not set'} | Category: {product.category?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/products')}
          >
            ← Back to Catalog
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setShowAdjModal(true)}
          >
            Reconcile Stock Count
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
          <span className="text-[10px] font-bold uppercase text-[#6B7280]">Available Stock</span>
          <div className="mt-2 text-2xl font-mono font-bold text-[#0A192F]">
            {product.currentStock} {product.unit}
          </div>
          <span className="text-[11px] text-[#6B7280]">Threshold: {product.reorderThreshold}</span>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
          <span className="text-[10px] font-bold uppercase text-[#6B7280]">Cost Price</span>
          <div className="mt-2 text-2xl font-mono font-bold text-[#6B7280]">
            {formatPaiseToInr(product.costPriceInPaise)}
          </div>
          <span className="text-[11px] text-[#6B7280]">Exclusive of GST</span>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
          <span className="text-[10px] font-bold uppercase text-[#6B7280]">Selling Price (MRP)</span>
          <div className="mt-2 text-2xl font-mono font-bold text-emerald-700">
            {formatPaiseToInr(product.sellingPriceInPaise)}
          </div>
          <span className="text-[11px] text-[#6B7280]">{product.taxRatePercentage}% GST slab</span>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
          <span className="text-[10px] font-bold uppercase text-[#6B7280]">Markup Margin</span>
          <div className="mt-2 text-2xl font-mono font-bold text-[#0A192F]">
            {marginPct}%
          </div>
          <span className="text-[11px] text-[#6B7280]">
            +{formatPaiseToInr(unitProfit)} per unit
          </span>
        </div>
      </div>

      {/* Movement History Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Stock Audit Movements for this SKU
          </h2>
          <Button
            variant="ghost"
            className="p-0 h-auto text-xs text-[#0A192F] hover:underline hover:bg-transparent"
            onClick={() => navigate(`/inventory/movements?productId=${product.id}`)}
          >
            View All Ledger →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Movement Type</th>
                <th className="py-2.5 px-4 font-semibold">Location</th>
                <th className="py-2.5 px-4 font-semibold">Delta Units</th>
                <th className="py-2.5 px-4 font-semibold">Reference</th>
                <th className="py-2.5 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#6B7280]">
                    No stock movements recorded yet for this product.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPos = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-[#F5F5F0]">
                      <td className="py-3 px-4 font-mono text-[#0A192F]">
                        {new Date(m.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#0A192F]">
                        {m.movementType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">{m.location?.name}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isPos ? 'text-emerald-700' : 'text-red-700'}>
                          {isPos ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                        {m.referenceType || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">{m.notes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physical Stock Reconciliation Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Reconcile Physical Stock Count
            </h3>
            <form onSubmit={handleAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Location Shelf
                </label>
                <select
                  value={adjLocationId}
                  onChange={(e) => setAdjLocationId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Actual Physical Count On Hand (Units) *
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(e.target.value)}
                  placeholder={`Current system count: ${product.currentStock}`}
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Reconciliation Reason / Justification *
                </label>
                <Input
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Physical inventory audit / Damage write-off"
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs border-[#E5E7EB] rounded-none"
                  onClick={() => setShowAdjModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-4"
                >
                  {isSubmittingAdj ? 'Saving...' : 'Post Stock Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
