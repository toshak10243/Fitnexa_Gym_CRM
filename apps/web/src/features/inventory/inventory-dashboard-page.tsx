import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

interface ValuationData {
  totalProductsCount: number;
  totalUnitsInStock: number;
  totalCostValuationPaise: number;
  totalRetailValuationPaise: number;
}

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [valRes, lowRes, movRes] = await Promise.all([
          apiClient.get('/inventory/valuation'),
          apiClient.get('/inventory/products?isLowStock=true&limit=6'),
          apiClient.get('/inventory/movements?limit=6'),
        ]);
        setValuation(valRes.data.data);
        setLowStockProducts(lowRes.data.data.items || []);
        setRecentMovements(movRes.data.data.items || []);
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  const costValuation = valuation?.totalCostValuationPaise || 0;
  const retailValuation = valuation?.totalRetailValuationPaise || 0;
  const potentialProfit = Math.max(0, retailValuation - costValuation);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Inventory & Retail Management
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative stock balances, physical reconciliation, supplier purchases, and GST retail catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/products')}
          >
            Product Catalog
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/pos')}
          >
            Launch POS Counter →
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Cost Valuation */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Asset Valuation (Cost)
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight">
            {formatPaiseToInr(costValuation)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Acquisition value across all locations
          </p>
        </div>

        {/* Total Retail Valuation */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Retail Valuation (MRP)
          </span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 tracking-tight">
            {formatPaiseToInr(retailValuation)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Expected gross retail yield
          </p>
        </div>

        {/* Total Units */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Total Stock On Hand
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#0A192F] tracking-tight">
              {valuation?.totalUnitsInStock || 0}
            </span>
            <span className="text-xs text-[#6B7280]">units</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Across {valuation?.totalProductsCount || 0} active SKUs
          </p>
        </div>

        {/* Potential Margin */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Unrealized Retail Margin
          </span>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight">
            {formatPaiseToInr(potentialProfit)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Potential inventory markup
          </p>
        </div>
      </div>

      {/* Quick Actions Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/products/new')}
        >
          <span>+ Add New Product</span>
          <span>→</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/purchases')}
        >
          <span>Purchase Orders (PO)</span>
          <span>→</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/transfers')}
        >
          <span>Stock Transfers</span>
          <span>→</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/movements')}
        >
          <span>Audit Movements Ledger</span>
          <span>→</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low-Stock Reorder Alerts */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                Low Stock Warnings
              </h2>
              {lowStockProducts.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                  {lowStockProducts.length} Reorder
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              className="p-0 h-auto text-xs text-[#0A192F] hover:underline hover:bg-transparent"
              onClick={() => navigate('/inventory/products?isLowStock=true')}
            >
              View All →
            </Button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                All product stock levels are healthy above reorder thresholds.
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-[#F5F5F0]">
                  <div>
                    <div className="font-bold text-[#0A192F]">{p.name}</div>
                    <div className="font-mono text-[11px] text-[#6B7280]">
                      SKU: {p.sku} | Threshold: {p.reorderThreshold}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-700 font-mono text-sm">
                      {p.currentStock} {p.unit}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="block text-[10px] mt-1 border-[#E5E7EB] rounded-none h-6 px-2"
                      onClick={() => navigate('/inventory/purchases')}
                    >
                      Reorder PO
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Stock Movements Feed */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Recent Stock Movements
            </h2>
            <Button
              variant="ghost"
              className="p-0 h-auto text-xs text-[#0A192F] hover:underline hover:bg-transparent"
              onClick={() => navigate('/inventory/movements')}
            >
              View Ledger →
            </Button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {recentMovements.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                No inventory movements recorded yet.
              </div>
            ) : (
              recentMovements.map((m) => {
                const isPositive = m.quantityDelta > 0;
                return (
                  <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-[#F5F5F0]">
                    <div>
                      <div className="font-bold text-[#0A192F]">{m.product?.name}</div>
                      <div className="text-[11px] text-[#6B7280]">
                        {m.movementType.replace(/_/g, ' ')} | Location: {m.location?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isPositive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                      </span>
                      <div className="text-[10px] font-mono text-[#6B7280]">
                        {new Date(m.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
