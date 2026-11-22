import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

export function PurchasesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [total, setTotal] = useState(0);

  // Create PO Modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<
    Array<{ productId: string; quantity: number; unitCostPaise: number }>
  >([{ productId: '', quantity: 1, unitCostPaise: 0 }]);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);
  const [poError, setPoError] = useState<string | null>(null);

  // Receive Goods Modal
  const [receiveTargetPo, setReceiveTargetPo] = useState<any | null>(null);
  const [receivedItems, setReceivedItems] = useState<
    Array<{ poItemId: string; quantity: number }>
  >([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [detailPurchase, setDetailPurchase] = useState<any | null>(null);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const [poRes, supRes, prodRes, locRes] = await Promise.all([
        apiClient.get('/inventory/purchases?limit=50'),
        apiClient.get('/inventory/suppliers'),
        apiClient.get('/inventory/products?limit=100'),
        apiClient.get('/inventory/locations'),
      ]);
      setPurchases(poRes.data.data.items || []);
      setTotal(poRes.data.data.total || 0);
      setSuppliers(supRes.data.data || []);
      setProducts(prodRes.data.data.items || []);
      const locations = locRes.data?.data || [];
      setBranchId(locations[0]?.branchId || '');
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { productId: '', quantity: 1, unitCostPaise: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setPoError('Please select a supplier');
      return;
    }
    if (!branchId) { setPoError('No branch/location is configured for inventory.'); return; }
    const validItems = poItems.filter((item) => item.productId && item.quantity > 0 && item.unitCostPaise > 0);
    if (validItems.length === 0) {
      setPoError('Please add a product, quantity, and purchase cost greater than â‚¹0');
      return;
    }

    setPoError(null);
    setIsSubmittingPo(true);
    try {
      await apiClient.post('/inventory/purchases', {
        branchId,
        supplierId: selectedSupplierId,
        items: validItems.map((item) => ({ productId: item.productId, quantityOrdered: item.quantity, unitCostInPaise: item.unitCostPaise })),
      });
      setIsPoModalOpen(false);
      setSelectedSupplierId('');
      setPoItems([{ productId: '', quantity: 1, unitCostPaise: 0 }]);
      fetchPurchases();
    } catch (err: any) {
      setPoError(err?.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const openReceiveModal = (po: any) => {
    setReceiveTargetPo(po);
    setReceivedItems(
      (po.items || []).map((item: any) => ({
        poItemId: item.id,
        quantity: Math.max(0, (item.quantityOrdered || item.quantity || 0) - (item.quantityReceived || item.receivedQuantity || 0)),
      })),
    );
    setReceiveError(null);
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveTargetPo) return;
    if (!branchId) { setReceiveError('No branch/location is configured for inventory.'); return; }
    setIsReceiving(true);
    setReceiveError(null);
    try {
      await apiClient.post(`/inventory/purchases/${receiveTargetPo.id}/receive`, {
        branchId,
        receivedItems: receivedItems.map((item) => ({ poItemId: item.poItemId, quantityReceived: item.quantity })).filter((item) => item.quantityReceived > 0),
      });
      setReceiveTargetPo(null);
      fetchPurchases();
    } catch (err: any) {
      setReceiveError(err?.response?.data?.message || 'Failed to record goods receipt');
    } finally {
      setIsReceiving(false);
    }
  };

  const handleDeletePurchase = async (po: any) => {
    if (!window.confirm(`Delete purchase order ${po.poNumber}?`)) return;
    try { await apiClient.delete(`/inventory/purchases/${po.id}`); fetchPurchases(); }
    catch (err: any) { window.alert(err?.response?.data?.message || 'Purchase order could not be deleted.'); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Purchase Orders & Stock Inward
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Supplier procurement orders, goods receipt notes (GRN), and automated stock increments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/suppliers')}
          >
            Manage Suppliers
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsPoModalOpen(true)}
          >
            + Create Purchase Order
          </Button>
        </div>
      </div>

      {/* PO List */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                    No purchase orders generated yet. Click &apos;+ Create Purchase Order&apos; to order stock.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => {
                  const isReceived = po.status === 'RECEIVED' || po.status === 'COMPLETED';
                  return (
                    <tr key={po.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {new Date(po.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0A192F]">
                        {po.supplier?.name || 'Direct Procurement'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {po.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                        {formatPaiseToInr(po.totalInPaise ?? po.totalAmountInPaise ?? 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-[#0A192F] border-[#0A192F] text-[11px] h-7 px-3 rounded-none" onClick={() => setDetailPurchase(po)}>View Details</Button>
                        {!isReceived && (
                          <Button
                            size="sm"
                            className="bg-[#0A192F] text-white hover:bg-[#162E52] text-[11px] h-7 px-3 rounded-none font-bold"
                            onClick={() => openReceiveModal(po)}
                          >
                            Receive Goods
                          </Button>
                        )}
                        {!po.goodsReceipts?.length && <Button size="sm" variant="outline" className="text-[#B91C1C] border-red-200 text-[11px] h-7 px-3 rounded-none" onClick={() => handleDeletePurchase(po)}>Delete</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
          Total Purchase Orders: <span className="font-bold text-[#0A192F]">{total}</span>
        </div>
      </div>

      {detailPurchase && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div><h2 className="text-base font-bold text-[#0A192F]">Purchase Order {detailPurchase.poNumber}</h2><p className="text-xs text-[#6B7280]">{detailPurchase.supplier?.name || 'Direct Procurement'}  {detailPurchase.status}</p></div>
              <button type="button" onClick={() => setDetailPurchase(null)} className="text-[#6B7280] text-lg">Ã—</button>
            </div>
            <div className="border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
              {(detailPurchase.items || []).map((item: any) => <div key={item.id} className="flex items-center justify-between p-3 text-xs"><div><div className="font-bold text-[#0A192F]">{item.product?.name || 'Product'}</div><div className="text-[#6B7280]">SKU: {item.product?.sku || ''}  Ordered: {item.quantityOrdered}  Received: {item.quantityReceived || 0}</div></div><div className="font-mono font-bold">{formatPaiseToInr(item.totalCostInPaise || 0)}</div></div>)}
            </div>
            <div className="flex justify-between border-t border-[#0A192F] pt-3 text-sm font-bold"><span>Total</span><span>{formatPaiseToInr(detailPurchase.totalInPaise ?? 0)}</span></div>
          </div>
        </div>, document.body,
      )}

      {/* Create PO Modal */}
      {isPoModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                New Purchase Order
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsPoModalOpen(false)}
              >
                âœ•
              </button>
            </div>

            {poError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {poError}
              </div>
            )}

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Supplier *
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstin ? `(${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase text-[#0A192F]">
                    Order Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-[#0A192F] font-bold hover:underline"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2 border border-[#E5E7EB] p-3 bg-white">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].productId = e.target.value;
                          const foundProd = products.find((p) => p.id === e.target.value);
                          if (foundProd) {
                            updated[idx].unitCostPaise = Number(
                              foundProd.costPriceInPaise ??
                              foundProd.purchasePriceInPaise ??
                              foundProd.sellingPriceInPaise ??
                              0,
                            );
                          }
                          setPoItems(updated);
                        }}
                        className="flex-1 text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-1.5 rounded-none font-medium text-[#0A192F]"
                      >
                        <option value="">Select SKU...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                          setPoItems(updated);
                        }}
                        placeholder="Qty"
                        className="w-20 text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
                      />

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(item.unitCostPaise / 100).toFixed(2)}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].unitCostPaise = Math.round(parseFloat(e.target.value || '0') * 100);
                          setPoItems(updated);
                        }}
                        placeholder="Cost (â‚¹)"
                        className="w-24 text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
                      />

                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-[#B91C1C] hover:text-red-700 font-mono text-sm px-1"
                        >
                          âœ•
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPoModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPo}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isSubmittingPo ? 'Generating PO...' : 'Issue Purchase Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Receive Goods Modal */}
      {receiveTargetPo && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                  Goods Receipt Note (GRN)
                </h2>
                <span className="font-mono text-xs text-[#6B7280]">
                  PO: {receiveTargetPo.poNumber}
                </span>
              </div>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setReceiveTargetPo(null)}
              >
                âœ•
              </button>
            </div>

            {receiveError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {receiveError}
              </div>
            )}

            <form onSubmit={handleReceiveGoods} className="space-y-4">
              <div className="space-y-2 border border-[#E5E7EB] p-3 bg-white">
                <div className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider grid grid-cols-12 gap-2 pb-1 border-b border-[#E5E7EB]">
                  <div className="col-span-8">Product Line</div>
                  <div className="col-span-4 text-right">Received Qty</div>
                </div>

                {receiveTargetPo.items?.map((item: any, idx: number) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs py-1">
                    <div className="col-span-8">
                      <div className="font-bold text-[#0A192F]">{item.product?.name}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">
                        Ordered: {item.quantityOrdered || item.quantity} | Prev Received: {item.quantityReceived || item.receivedQuantity || 0}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min="0"
                        max={(item.quantityOrdered || item.quantity) - (item.quantityReceived || item.receivedQuantity || 0)}
                        value={receivedItems[idx]?.quantity || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          const updated = [...receivedItems];
                          updated[idx] = { poItemId: item.id, quantity: val };
                          setReceivedItems(updated);
                        }}
                        className="text-xs text-right border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReceiveTargetPo(null)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isReceiving}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isReceiving ? 'Processing...' : 'Confirm Goods Inward'}
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


