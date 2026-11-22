import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import QRCode from 'qrcode';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjLocationId, setAdjLocationId] = useState('');
  const [physicalCount, setPhysicalCount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [movementDirection, setMovementDirection] = useState<'IN' | 'OUT'>('IN');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, locRes, movRes] = await Promise.all([
        apiClient.get(`/inventory/products/${id}`),
        apiClient.get('/inventory/locations'),
        apiClient.get(`/inventory/movements?productId=${id}&limit=10`),
      ]);
      setProduct(prodRes.data.data);
      const publicBase = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
      const publicUrl = `${publicBase}/public/products/${id}`;
      const qrPayload = [
        publicUrl,
        `Product: ${prodRes.data.data.name}`,
        `SKU: ${prodRes.data.data.sku}`,
        `Barcode: ${prodRes.data.data.barcode || 'N/A'}`,
        `Category: ${prodRes.data.data.category?.name || 'N/A'}`,
      ].join('\n');
      setQrDataUrl(await QRCode.toDataURL(qrPayload, { width: 320, margin: 2, errorCorrectionLevel: 'M' }));
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

  const downloadQr = () => {
    if (!qrDataUrl || !product) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${product.sku || product.name}-qr.png`;
    link.click();
  };

  useEffect(() => {
    if (!showAdjModal) return;
    // Refresh shelves when the dialog opens so a newly provisioned default
    // shelf is immediately available without a full page reload.
    apiClient.get('/inventory/locations').then((res) => {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : payload?.items || [];
      setLocations(list);
      if (list.length > 0 && !list.some((loc: any) => loc.id === adjLocationId)) {
        setAdjLocationId(list[0].id);
      }
    }).catch(() => undefined);
  }, [showAdjModal]);

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalCount || !adjReason.trim() || !adjLocationId) return;

    setIsSubmittingAdj(true);
    try {
      await apiClient.post('/inventory/adjustments', {
        branchId: locations[0]?.branchId || '',
        productId: id,
        locationId: adjLocationId,
        physicalQuantity: Math.max(0, product.currentStock + (movementDirection === 'IN' ? parseInt(physicalCount, 10) : -parseInt(physicalCount, 10))),
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
            â† Back to Catalog
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setShowAdjModal(true)}
          >
            Stock In / Out
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 border border-[#E5E7EB] bg-[#FBFBF9] p-6">
        <div className="h-72 border border-[#E5E7EB] bg-[#F5F5F0] flex items-center justify-center overflow-hidden">
          {product.photoUrl ? <img src={product.photoUrl} alt={product.name} className="h-full w-full object-contain" /> : <span className="text-7xl font-bold text-[#0A192F]">{product.name?.charAt(0) || 'P'}</span>}
        </div>
        <div className="space-y-4">
          <div><span className="text-[10px] uppercase tracking-wider text-[#6B7280]">Retail product</span><h2 className="mt-1 text-2xl font-bold text-[#0A192F]">{product.name}</h2><p className="mt-1 text-sm text-[#6B7280]">{product.description || 'Gym retail inventory product'}</p></div>
          <div><span className="block text-[10px] uppercase text-[#6B7280]">Selling price</span><span className="text-3xl font-bold text-[#0A192F]">{formatPaiseToInr(product.sellingPriceInPaise)}</span></div>
          <div className="grid grid-cols-2 gap-3 border-y border-[#E5E7EB] py-4 text-xs"><div><span className="text-[#6B7280]">Category</span><div className="font-semibold text-[#0A192F]">{product.category?.name || 'Uncategorised'}</div></div><div><span className="text-[#6B7280]">Unit</span><div className="font-semibold text-[#0A192F]">{product.unit}</div></div><div><span className="text-[#6B7280]">SKU</span><div className="font-mono font-semibold text-[#0A192F]">{product.sku}</div></div><div><span className="text-[#6B7280]">Barcode</span><div className="font-mono font-semibold text-[#0A192F]">{product.barcode || 'Not set'}</div></div><div><span className="text-[#6B7280]">GST / HSN</span><div className="font-semibold text-[#0A192F]">{product.taxRatePercentage}% / {product.hsnCode || 'N/A'}</div></div><div><span className="text-[#6B7280]">Reorder level</span><div className="font-semibold text-[#0A192F]">{product.reorderThreshold} {product.unit}</div></div></div>
          <div className="mt-5 border border-[#E5E7EB] p-4 flex items-center gap-5"><div className="border border-[#E5E7EB] bg-white p-2 shrink-0">{qrDataUrl && <img src={qrDataUrl} alt="Public product QR code" className="h-36 w-36" />}</div><div><div className="text-xs font-bold uppercase text-[#0A192F]">Public product QR</div><p className="text-xs text-[#6B7280] mt-1">Scan to open this productâ€™s public detail page.</p><Button type="button" onClick={downloadQr} className="mt-3 rounded-none text-xs">Download QR</Button></div></div>
          <div className={`border px-3 py-2 text-xs font-bold ${isLow ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{isLow ? 'LOW STOCK - REORDER REQUIRED' : 'IN STOCK - AVAILABLE FOR SALE'}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-3">Product Information</h3>
          <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-[#6B7280]">Product ID</dt><dd className="font-mono text-[#0A192F]">{product.id}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Status</dt><dd className="font-bold text-emerald-700">{product.isActive === false ? 'INACTIVE' : 'ACTIVE'}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Created</dt><dd className="text-[#0A192F]">{product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN') : ''}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Last updated</dt><dd className="text-[#0A192F]">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-IN') : ''}</dd></div></dl>
        </div>
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-3">Pricing & Tax</h3>
          <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-[#6B7280]">Cost price</dt><dd className="font-mono font-bold">{formatPaiseToInr(product.costPriceInPaise)}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Selling price</dt><dd className="font-mono font-bold text-emerald-700">{formatPaiseToInr(product.sellingPriceInPaise)}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Unit margin</dt><dd className="font-mono">{formatPaiseToInr(unitProfit)}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">GST slab</dt><dd className="font-bold">{product.taxRatePercentage}%</dd></div></dl>
        </div>
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-3">Inventory Controls</h3>
          <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-[#6B7280]">Stock on hand</dt><dd className="font-mono font-bold">{product.currentStock} {product.unit}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Reorder threshold</dt><dd className="font-mono">{product.reorderThreshold} {product.unit}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Stock status</dt><dd className={isLow ? 'font-bold text-red-700' : 'font-bold text-emerald-700'}>{isLow ? 'REORDER' : 'HEALTHY'}</dd></div><div className="flex justify-between"><dt className="text-[#6B7280]">Tracked unit</dt><dd className="font-bold">{product.unit}</dd></div></dl>
        </div>
      </section>

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
            View All Ledger â†’
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
                        {m.referenceType || 'â€”'}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">{m.notes || 'â€”'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physical Stock Reconciliation Modal */}
      {showAdjModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
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
                  {locations.length === 0 && <option value="">No stock shelf configured</option>}
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setMovementDirection('IN')} className={`px-3 py-2 text-xs border ${movementDirection === 'IN' ? 'bg-[#0A192F] text-white' : 'border-[#E5E7EB]'}`}>Stock In</button>
                <button type="button" onClick={() => setMovementDirection('OUT')} className={`px-3 py-2 text-xs border ${movementDirection === 'OUT' ? 'bg-[#B91C1C] text-white' : 'border-[#E5E7EB]'}`}>Stock Out</button>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Quantity (Units) *
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
        </div>,
        document.body
      )}
    </div>
  );
}


