import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@fitnexa/shared';

export function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN;
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(
    searchParams.get('isLowStock') === 'true',
  );
  const handleDelete = async (product: any) => {
    if (!window.confirm(`Deactivate ${product.name}?`)) return;
    try {
      await apiClient.delete(`/inventory/products/${product.id}`);
      await fetchProducts();
    } catch (err: any) { window.alert(err.message || 'Unable to delete product.'); }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let url = `/inventory/products?page=${page}&limit=${pageSize}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedCat) url += `&categoryId=${selectedCat}`;
      if (isLowStockOnly) url += '&isLowStock=true';

      const [prodRes, catRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/inventory/categories'),
      ]);

      setProducts(prodRes.data.data.items || []);
      setTotal(prodRes.data.data.total || 0);
      setCategories(catRes.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCat, isLowStockOnly, page]);

  useEffect(() => { setPage(1); }, [search, selectedCat, isLowStockOnly]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Retail Product Catalog
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Supplements, apparel, gym accessories, beverage coolers, and retail inventory SKUs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory')}
          >
            â† Valuation Dashboard
          </Button>
          {canCreate && (
            <Button
              className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
              onClick={() => navigate('/inventory/products/new')}
            >
              + Create Product
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="text-xs border-[#E5E7EB] bg-white h-9 rounded-none w-64"
          />

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none font-medium text-[#0A192F] h-9"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="flex items-center space-x-2 text-xs font-semibold text-[#0A192F] cursor-pointer">
            <input
              type="checkbox"
              checked={isLowStockOnly}
              onChange={(e) => setIsLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
            />
            <span>Low Stock Reorders Only</span>
          </label>
        </div>

        <span className="text-xs text-[#6B7280]">
          Total Products: <strong className="text-[#0A192F]">{total}</strong>
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Image</th>
                  <th className="py-2.5 px-4 font-semibold">Product Name</th>
                  <th className="py-2.5 px-4 font-semibold">SKU / Barcode</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Cost Price</th>
                  <th className="py-2.5 px-4 font-semibold">Retail Price</th>
                  <th className="py-2.5 px-4 font-semibold">GST Slab</th>
                  <th className="py-2.5 px-4 font-semibold">Stock On Hand</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                      No products found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLow = p.isLowStock;
                    return (
                      <tr key={p.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 w-20">
                          {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-12 w-12 object-cover border border-[#E5E7EB]" /> : <div className="h-12 w-12 bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center text-lg font-bold">{p.name?.charAt(0)}</div>}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0A192F]">
                          <button
                            type="button"
                            className="hover:underline text-left"
                            onClick={() => navigate(`/inventory/products/${p.id}`)}
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B7280]">
                          <div>{p.sku}</div>
                          {p.barcode && (
                            <span className="text-[10px] text-[#9CA3AF]">{p.barcode}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">{p.category?.name || ''}</td>
                        <td className="py-3 px-4 font-mono text-[#6B7280]">
                          {formatPaiseToInr(p.costPriceInPaise)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                          {formatPaiseToInr(p.sellingPriceInPaise)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B7280]">
                          {p.taxRatePercentage}% GST {p.hsnCode ? `(HSN ${p.hsnCode})` : ''}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={`font-bold ${
                              isLow ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                          {isLow && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                              Low Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap min-w-[250px]">
                          <div className="flex items-center justify-end gap-1">
                          {canCreate && <Button
                            variant="outline"
                            size="sm"
                            className="mr-1 text-xs border-[#E5E7EB] rounded-none h-7 px-2"
                            onClick={() => navigate('/inventory/products/new', { state: { product: p } })}
                          >Edit</Button>}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-[#E5E7EB] hover:bg-[#0A192F] hover:text-white rounded-none h-7 px-3"
                            onClick={() => navigate(`/inventory/products/${p.id}`)}
                          >
                            Inspect
                          </Button>
                          {canCreate && <Button variant="outline" size="sm" className="text-xs border-red-200 text-red-700 rounded-none h-7 px-2" onClick={() => handleDelete(p)}>Delete</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between border border-[#E5E7EB] bg-[#FBFBF9] px-4 py-3 text-xs">
          <span className="text-[#6B7280]">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} products</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-none text-xs">Previous</Button>
            {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((n) => <Button key={n} variant="outline" size="sm" onClick={() => setPage(n)} className={`rounded-none text-xs ${n === page ? 'bg-[#0A192F] text-[#FBFBF9]' : ''}`}>{n}</Button>)}
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)} className="rounded-none text-xs">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}


