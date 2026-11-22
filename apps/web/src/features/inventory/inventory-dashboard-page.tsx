import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [valRes, lowRes, movRes, salesRes] = await Promise.all([
          apiClient.get('/inventory/valuation'),
          apiClient.get('/inventory/products?isLowStock=true&limit=6'),
          apiClient.get('/inventory/movements?limit=6'),
          apiClient.get('/pos/sales?page=1&limit=100'),
        ]);
        const valuationData = valRes.data?.data ?? valRes.data;
        const lowStockData = lowRes.data?.data ?? lowRes.data;
        const movementData = movRes.data?.data ?? movRes.data;
        setValuation(valuationData);
        setLowStockProducts(Array.isArray(lowStockData) ? lowStockData : lowStockData?.items || []);
        setRecentMovements(Array.isArray(movementData) ? movementData : movementData?.items || []);
        setSales(salesRes.data?.data?.items || []);
      } catch (error: any) {
        setLoadError(error?.message || 'Unable to load inventory data.');
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
  const monthlySales = sales.reduce((map: Record<string, number>, sale: any) => { const date = new Date(sale.createdAt || sale.invoiceDate); const key = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); map[key] = (map[key] || 0) + Number(sale.grandTotalInPaise || 0); return map; }, {});
  const dashboardSales = sales.reduce((data: any, sale: any) => {
    const total = Number(sale.grandTotalInPaise || 0);
    data.revenue += total; data.transactions += 1;
    const customer = sale.member?.fullName || sale.walkInCustomerName || 'Walk-in Customer'; data.customers[customer] = (data.customers[customer] || 0) + total;
    (sale.lineItems || []).forEach((line: any) => { const name = line.description || 'Product'; data.products[name] = (data.products[name] || 0) + Number(line.quantity || 0); data.categories[line.categoryName || 'Uncategorised'] = (data.categories[line.categoryName || 'Uncategorised'] || 0) + Number(line.totalAmountInPaise || 0); });
    return data;
  }, { revenue: 0, transactions: 0, customers: {}, products: {}, categories: {} });
  const topProducts = Object.entries(dashboardSales.products).map(([name, units]) => ({ name, units })).sort((a: any, b: any) => Number(b.units) - Number(a.units)).slice(0, 6);
  const topCustomers = Object.entries(dashboardSales.customers).map(([name, value]) => ({ name, value: Math.round(Number(value) / 100) })).sort((a: any, b: any) => b.value - a.value).slice(0, 6);
  const categorySales = Object.entries(dashboardSales.categories).map(([name, value]) => ({ name, value: Math.round(Number(value) / 100) }));
  const stockRisk = lowStockProducts.slice(0, 8);

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
            Launch POS Counter â†’
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]" role="alert">
          {loadError} <button className="ml-3 underline" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Valuation */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#0A192F] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Asset Valuation (Cost)
            </span>
            <div className="h-8 w-8 rounded-none bg-slate-100 border border-slate-300 text-[#0A192F] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight font-mono">
            {formatPaiseToInr(costValuation)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Acquisition cost across active SKUs
          </p>
        </div>

        {/* Total Retail Valuation */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-emerald-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Retail Valuation (MRP)
            </span>
            <div className="h-8 w-8 rounded-none bg-emerald-100/70 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 tracking-tight font-mono">
            {formatPaiseToInr(retailValuation)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Expected gross retail sales yield
          </p>
        </div>

        {/* Total Units */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#1D4ED8] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Total Stock On Hand
            </span>
            <div className="h-8 w-8 rounded-none bg-blue-100/70 border border-blue-200 text-[#1D4ED8] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#0A192F] tracking-tight font-mono">
              {valuation?.totalUnitsInStock || 0}
            </span>
            <span className="text-xs text-[#6B7280]">units</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Across {valuation?.totalProductsCount || 0} active retail SKUs
          </p>
        </div>

        {/* Potential Margin */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-purple-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Unrealized Retail Margin
            </span>
            <div className="h-8 w-8 rounded-none bg-purple-100/70 border border-purple-200 text-purple-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-800 tracking-tight font-mono">
            {formatPaiseToInr(potentialProfit)}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Net markup on active supplements & goods
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#EFF6FF] border border-blue-200 p-5"><div className="text-[10px] uppercase tracking-wider text-blue-700">POS sales revenue</div><div className="mt-2 text-2xl font-bold text-[#0A192F]">{formatPaiseToInr(dashboardSales.revenue)}</div><p className="text-[11px] text-blue-700 mt-2">Loaded transactions</p></div>
        <div className="bg-[#ECFDF5] border border-emerald-200 p-5"><div className="text-[10px] uppercase tracking-wider text-emerald-700">Completed transactions</div><div className="mt-2 text-2xl font-bold text-emerald-800">{dashboardSales.transactions}</div><p className="text-[11px] text-emerald-700 mt-2">POS invoices recorded</p></div>
        <div className="bg-[#FFF7ED] border border-orange-200 p-5"><div className="text-[10px] uppercase tracking-wider text-orange-700">Top product units</div><div className="mt-2 text-2xl font-bold text-orange-800">{Number(topProducts[0]?.units ?? 0)}</div><p className="text-[11px] text-orange-700 mt-2 truncate">{topProducts[0]?.name || 'No sales yet'}</p></div>
        <div className="bg-[#FEF2F2] border border-red-200 p-5"><div className="text-[10px] uppercase tracking-wider text-red-700">Products at risk</div><div className="mt-2 text-2xl font-bold text-red-800">{stockRisk.length}</div><p className="text-[11px] text-red-700 mt-2">Near reorder threshold</p></div>
      </div>
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">Monthly retail sales</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(monthlySales).map(([month, value]) => ({ month, revenue: Math.round(Number(value) / 100) }))}><CartesianGrid stroke="#E5E7EB" vertical={false}/><XAxis dataKey="month" fontSize={10}/><YAxis fontSize={10}/><Tooltip formatter={(value) => `â‚¹${Number(value).toLocaleString('en-IN')}`}/><Bar dataKey="revenue" fill="#0A192F" name="Revenue"/></BarChart></ResponsiveContainer></div></div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">Top products sold</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={topProducts} layout="vertical"><CartesianGrid stroke="#E5E7EB" horizontal={false}/><XAxis type="number" fontSize={10}/><YAxis type="category" dataKey="name" width={150} fontSize={9}/><Tooltip/><Bar dataKey="units" fill="#047857" name="Units"/></BarChart></ResponsiveContainer></div></div>
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">Sales by category</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categorySales} dataKey="value" nameKey="name" outerRadius={75} label>{categorySales.map((entry, index) => <Cell key={entry.name} fill={['#0A192F', '#047857', '#B91C1C', '#D97706'][index % 4]}/>)}</Pie><Tooltip formatter={(value) => `â‚¹${Number(value).toLocaleString('en-IN')}`}/><Legend/></PieChart></ResponsiveContainer></div></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">Highest value customers</h2><div className="space-y-2">{topCustomers.length ? topCustomers.map((customer) => <div key={customer.name} className="flex justify-between border-b border-[#E5E7EB] pb-2 text-xs"><span className="font-bold">{customer.name}</span><span className="font-mono text-emerald-700">{formatPaiseToInr(customer.value * 100)}</span></div>) : <p className="text-xs text-[#6B7280]">No customer sales recorded yet.</p>}</div></div>
        <div className="bg-[#FEF2F2] border border-red-200 p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-3">What may finish soon</h2><div className="space-y-2">{stockRisk.length ? stockRisk.map((product) => <div key={product.id} className="flex justify-between border-b border-red-200 pb-2 text-xs"><span className="font-bold text-[#0A192F]">{product.name}</span><span className="font-mono text-red-700">{product.currentStock} left</span></div>) : <p className="text-xs text-red-700">No immediate stock risks.</p>}</div></div>
      </div>

      {/* Quick Actions Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/products/new')}
        >
          <span>+ Add New Product</span>
          <span>â†’</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/purchases')}
        >
          <span>Purchase Orders (PO)</span>
          <span>â†’</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/transfers')}
        >
          <span>Stock Transfers</span>
          <span>â†’</span>
        </Button>
        <Button
          variant="outline"
          className="border-[#E5E7EB] justify-between text-xs rounded-none h-11 bg-white hover:bg-[#F5F5F0]"
          onClick={() => navigate('/inventory/movements')}
        >
          <span>Audit Movements Ledger</span>
          <span>â†’</span>
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
              View All â†’
            </Button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                All product stock levels are healthy above reorder thresholds.
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-[#F5F5F0] transition-colors">
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

        {/* Recent Inventory Movements */}
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
              View All â†’
            </Button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {recentMovements.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                No recent stock adjustments recorded.
              </div>
            ) : (
              recentMovements.map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-[#F5F5F0] transition-colors">
                  <div>
                    <div className="font-bold text-[#0A192F]">{m.product?.name || 'Stock Adjustment'}</div>
                    <div className="text-[11px] text-[#6B7280]">
                      Reason: <span className="font-medium text-[#111827]">{m.reason || 'Inventory Transaction'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        (m.quantityDelta ?? m.quantity ?? 0) > 0 ? 'text-emerald-700' : 'text-[#B91C1C]'
                      }`}
                    >
                      {(m.quantityDelta ?? m.quantity ?? 0) > 0
                        ? `+${m.quantityDelta ?? m.quantity}`
                        : (m.quantityDelta ?? m.quantity ?? 0)}
                    </span>
                    <div className="text-[10px] text-[#6B7280]">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


