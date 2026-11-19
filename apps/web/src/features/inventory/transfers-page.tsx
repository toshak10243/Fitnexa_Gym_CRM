import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

export function TransfersPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Transfer Form State
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [transferItems, setTransferItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 },
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [locRes, prodRes] = await Promise.all([
          apiClient.get('/inventory/locations'),
          apiClient.get('/inventory/products?limit=100'),
        ]);
        setLocations(locRes.data.data || []);
        setProducts(prodRes.data.data.items || []);
        if (locRes.data.data?.length >= 2) {
          setSourceLocationId(locRes.data.data[0].id);
          setDestinationLocationId(locRes.data.data[1].id);
        }
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setTransferItems([...transferItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (transferItems.length > 1) {
      setTransferItems(transferItems.filter((_, i) => i !== idx));
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destinationLocationId) {
      setErrorMsg('Source and Destination locations are required');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setErrorMsg('Source and Destination locations must be different');
      return;
    }

    const validItems = transferItems.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg('Please select at least one valid product and quantity');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/inventory/transfers', {
        sourceLocationId,
        destinationLocationId,
        items: validItems,
        notes: notes.trim() || undefined,
      });
      setSuccessMsg('Inventory transferred successfully. Stock balances updated.');
      setTransferItems([{ productId: '', quantity: 1 }]);
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Internal Stock Transfer
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Move stock between main storeroom, front-desk retail showcase, beverage chillers, or other branches.
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
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/movements')}
          >
            Movement Ledger
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 font-bold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 border border-red-200 bg-red-50 text-xs text-[#B91C1C] font-bold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleTransfer} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Source Location *
            </label>
            <select
              required
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">Select Origin...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.code ? `(${loc.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Destination Location *
            </label>
            <select
              required
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">Select Destination...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.code ? `(${loc.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold uppercase text-[#0A192F]">
              Transfer Line Items
            </label>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-xs text-[#0A192F] font-bold hover:underline"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-2 border border-[#E5E7EB] p-4 bg-white">
            {transferItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select
                  required
                  value={item.productId}
                  onChange={(e) => {
                    const updated = [...transferItems];
                    updated[idx].productId = e.target.value;
                    setTransferItems(updated);
                  }}
                  className="flex-1 text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select SKU...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>

                <Input
                  type="number"
                  min="1"
                  required
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...transferItems];
                    updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                    setTransferItems(updated);
                  }}
                  placeholder="Qty"
                  className="w-24 text-xs border-[#E5E7EB] bg-[#FBFBF9] h-9 rounded-none font-mono"
                />

                {transferItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    className="text-[#B91C1C] hover:text-red-700 font-mono text-sm px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
            Dispatch Notes / Authorization Reference
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Stock replenished for Saturday rush; authorized by floor supervisor."
            className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-10 px-6 font-bold"
          >
            {isSubmitting ? 'Transferring Stock...' : 'Execute Stock Transfer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
