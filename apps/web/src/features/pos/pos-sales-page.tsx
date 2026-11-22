import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

const amount = (obj: any, ...keys: string[]) => {
  const key = keys.find((candidate) => obj?.[candidate] !== undefined && obj?.[candidate] !== null);
  return Number(key ? obj[key] : 0) || 0;
};

const saleTotal = (sale: any) => amount(sale?.invoice || sale, 'grandTotalInPaise', 'totalInPaise', 'grandTotalPaise', 'totalPaise', 'grandTotal');

export function PosSalesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerType, setCustomerType] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    const min = minAmount === '' ? 0 : Number(minAmount) * 100;
    const max = maxAmount === '' ? Number.MAX_SAFE_INTEGER : Number(maxAmount) * 100;
    return sales.filter((sale) => {
      const invoice = sale.invoice || sale;
      const status = String(invoice.status || sale.status || 'PAID').toUpperCase();
      const payment = String(sale.paymentMethod || invoice.paymentMethod || sale.allocations?.[0]?.payment?.method || '').toUpperCase();
      const customer = sale.member?.fullName || sale.walkInCustomerName || 'Walk-in Customer';
      const products = (sale.lineItems || []).map((item: any) => `${item.description || ''} ${item.productName || ''} ${item.sku || ''}`).join(' ');
      const haystack = `${customer} ${sale.walkInCustomerPhone || ''} ${invoice.invoiceNumber || ''} ${sale.id || ''}`.toLowerCase();
      const created = new Date(sale.createdAt).getTime();
      return (!query || haystack.includes(query)) &&
        (paymentFilter === 'ALL' || payment === paymentFilter) &&
        (statusFilter === 'ALL' || status === statusFilter) &&
        (customerType === 'ALL' || (customerType === 'MEMBER' ? Boolean(sale.member) : !sale.member)) &&
        (!productSearch.trim() || products.toLowerCase().includes(productSearch.trim().toLowerCase())) &&
        created >= from && created <= to &&
        saleTotal(sale) >= min && saleTotal(sale) <= max;
    }).sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'highest') return saleTotal(b) - saleTotal(a);
      if (sortBy === 'lowest') return saleTotal(a) - saleTotal(b);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sales, search, paymentFilter, statusFilter, dateFrom, dateTo, minAmount, maxAmount, sortBy, productSearch, customerType]);

  const clearFilters = () => {
    setSearch(''); setPaymentFilter('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setSortBy('newest'); setProductSearch(''); setCustomerType('ALL');
  };


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
            â† Inventory
          </Button>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none"
            onClick={() => setShowFilters((visible) => !visible)}
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/pos')}
          >
            Open POS Counter â†’
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 border border-[#E5E7EB] bg-[#FBFBF9] p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer name, phone..." className="h-9 flex-1 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs focus-visible:outline-2 focus-visible:outline-[#0A192F]" />
        {search && <button type="button" onClick={() => setSearch('')} className="text-xs text-[#B91C1C] hover:underline">Clear search</button>}
      </div>

      {showFilters && <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Sales filters</span>
          <button type="button" onClick={clearFilters} className="text-xs text-[#B91C1C] hover:underline">Clear all</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer, phone..." className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs focus-visible:outline-2 focus-visible:outline-[#0A192F]" />
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs">
            <option value="ALL">All payment methods</option><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD_MANUAL">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs">
            <option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="REFUNDED">Refunded</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option>
          </select>
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs"><option value="ALL">All customers</option><option value="MEMBER">Members only</option><option value="WALKIN">Walk-in only</option></select>
          <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Filter by product / SKU" className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs" />
          <label className="text-[10px] text-[#6B7280]">From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-full h-8 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-xs" /></label>
          <label className="text-[10px] text-[#6B7280]">To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-full h-8 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-xs" /></label>
          <input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Minimum amount (â‚¹)" className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs" />
          <input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Maximum amount (â‚¹)" className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs" />
        </div>
      </div>}

      {/* Sales Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Transaction / Time</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status / Payment</th>
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
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#6B7280]">
                    No POS sales recorded yet. Click &apos;Open POS Counter&apos; to process your first sale.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const invoice = sale.invoice || sale;
                  const status = String(invoice.status || sale.status || 'PAID').toUpperCase();
                  const paid = status === 'PAID' || status === 'COMPLETED';
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
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${paid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280]'}`}>
                          {status}
                        </span>
                        <div className="mt-1 text-[10px] text-[#6B7280]">{sale.paymentMethod || invoice.paymentMethod || sale.allocations?.[0]?.payment?.method || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#6B7280]">
                        {formatPaiseToInr(amount(invoice, 'subtotalInPaise', 'subtotalPaise', 'subtotal'))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#6B7280]">
                        {formatPaiseToInr(amount(invoice, 'taxAmountInPaise', 'taxPaise', 'taxAmount'))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                        {formatPaiseToInr(saleTotal(sale))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1"><Button size="sm" variant="outline" title="View invoice" aria-label="View invoice" onClick={() => navigate(`/pos/sales/${sale.id}`)} className="h-7 w-8 p-0 rounded-none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></Button><Button size="sm" variant="outline" title="Download PDF" onClick={() => navigate(`/pos/sales/${sale.id}?print=1`)} className="h-7 px-2 rounded-none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M8 12h8M8 16h6"/></svg></Button><Button size="sm" variant="outline" title="WhatsApp" onClick={() => window.open("https://wa.me/" + String(sale.member?.phone || sale.walkInCustomerPhone || "").replace(/\\D/g, "") + "?text=" + encodeURIComponent("Invoice " + (invoice.invoiceNumber || "") + ": " + window.location.origin + "/pos/sales/" + sale.id), "_blank")} className="h-7 px-2 text-[#047857] border-[#A7F3D0] rounded-none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20 11.5a8 8 0 0 1-12.4 6.7L4 19l.9-3.4A8 8 0 1 1 20 11.5Z"/><path d="M8.5 9.2c.8 2 2 3.2 4.1 4.1"/></svg></Button><Button size="sm" variant="outline" title="Email" onClick={() => { window.location.href = "mailto:" + (sale.member?.email || sale.walkInCustomerEmail || ""); }} className="h-7 px-2 text-[#B91C1C] border-[#FECACA] rounded-none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><rect x="3" y="5" width="18" height="14"/><path d="m4 7 8 6 8-6"/></svg></Button></div>
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
            Showing <span className="font-bold text-[#0A192F]">{filteredSales.length}</span> of{' '}
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





