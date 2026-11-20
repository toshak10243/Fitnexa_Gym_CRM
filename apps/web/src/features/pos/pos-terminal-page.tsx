import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { PaymentMethodType } from '@fitnexa/shared';

interface CartItem {
  product: any;
  quantity: number;
  unitPriceInPaise: number;
  discountInPaise: number;
  taxRatePercentage: number;
}

export function PosTerminalPage() {
  const navigate = useNavigate();

  // Catalog State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState<'WALK_IN' | 'MEMBER'>('WALK_IN');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(PaymentMethodType.UPI);
  const [paymentReference, setPaymentReference] = useState('');
  const [cashTenderedPaise, setCashTenderedPaise] = useState<number>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);

  // Active branch
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [prodRes, catRes, userRes] = await Promise.all([
          apiClient.get('/inventory/products?limit=100'),
          apiClient.get('/inventory/categories'),
          apiClient.get('/auth/me'),
        ]);
        setProducts(prodRes.data.data.items || []);
        setCategories(catRes.data.data || []);
        if (userRes.data.data?.branchId) {
          setBranchId(userRes.data.data.branchId);
        }
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Search members if member search changes
  useEffect(() => {
    if (customerType === 'MEMBER' && memberSearch.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiClient.get(`/members?search=${encodeURIComponent(memberSearch.trim())}&limit=5`);
          setMembers(res.data.data.items || []);
        } catch {
          // Handled gracefully
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [memberSearch, customerType]);

  const addToCart = (product: any) => {
    if (product.currentStock <= 0) {
      alert(`Cannot add ${product.name}: Out of stock.`);
      return;
    }

    const existingIdx = cart.findIndex((item) => item.product.id === product.id);
    if (existingIdx >= 0) {
      if (cart[existingIdx].quantity >= product.currentStock) {
        alert(`Cannot add more: Max available stock is ${product.currentStock}.`);
        return;
      }
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPriceInPaise: product.sellingPriceInPaise,
          discountInPaise: 0,
          taxRatePercentage: product.gstRatePercentage || 18,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }
    const maxStock = cart[index].product.currentStock;
    if (newQty > maxStock) {
      alert(`Max available stock is ${maxStock}`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Calculations
  const subtotalPaise = cart.reduce(
    (sum, item) => sum + item.unitPriceInPaise * item.quantity - item.discountInPaise,
    0,
  );
  const taxPaise = cart.reduce((sum, item) => {
    const itemTotal = item.unitPriceInPaise * item.quantity - item.discountInPaise;
    return sum + Math.round((itemTotal * item.taxRatePercentage) / 100);
  }, 0);
  const grandTotalPaise = subtotalPaise + taxPaise;
  const changeDuePaise = Math.max(0, cashTenderedPaise - grandTotalPaise);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cart is empty.');
      return;
    }

    setCheckoutError(null);
    setIsCheckingOut(true);
    try {
      const payload = {
        branchId,
        memberId: customerType === 'MEMBER' && selectedMemberId ? selectedMemberId : undefined,
        walkInCustomerName: customerType === 'WALK_IN' ? walkInName || 'Walk-in Customer' : undefined,
        walkInCustomerPhone: customerType === 'WALK_IN' ? walkInPhone || undefined : undefined,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPriceInPaise: item.unitPriceInPaise,
          discountInPaise: item.discountInPaise,
          taxRatePercentage: item.taxRatePercentage,
        })),
        idempotencyKey: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };

      const res = await apiClient.post('/pos/checkout', payload);
      setLastCompletedSale(res.data.data);
      // Reset cart
      setCart([]);
      setWalkInName('');
      setWalkInPhone('');
      setSelectedMemberId('');
      setCashTenderedPaise(0);
      setPaymentReference('');
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesCat = !selectedCat || p.categoryId === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#FBFBF9]">
      {/* Left Column: Product Selection Counter */}
      <div className="flex-1 flex flex-col border-r border-[#E5E7EB] overflow-hidden">
        {/* Counter Header & Search Toolbar */}
        <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-[#0A192F]">
                Retail POS Counter
              </h1>
              <p className="text-[11px] text-[#6B7280]">
                Front-desk quick checkout with automated GST invoice generation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] h-8"
                onClick={() => navigate('/pos/sales')}
              >
                Sales History
              </Button>
              <Button
                variant="outline"
                className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] h-8"
                onClick={() => navigate('/inventory')}
              >
                Inventory
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scan barcode or type SKU / product name..."
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-9 rounded-none font-mono"
                autoFocus
              />
            </div>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="text-xs border border-[#E5E7EB] bg-[#FBFBF9] px-3 h-9 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#6B7280]">
              No products found matching &apos;{search}&apos;.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`text-left p-3 border transition-colors flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-gray-100 border-[#E5E7EB] opacity-50 cursor-not-allowed'
                        : 'bg-white border-[#E5E7EB] hover:border-[#0A192F] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-mono text-[#6B7280]">{p.sku}</div>
                      <div className="text-xs font-bold text-[#0A192F] line-clamp-2 mt-0.5">
                        {p.name}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[#0A192F]">
                        {formatPaiseToInr(p.sellingPriceInPaise)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          isOutOfStock ? 'text-[#B91C1C]' : 'text-emerald-700'
                        }`}
                      >
                        {isOutOfStock ? 'OOS' : `${p.currentStock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart & Tender Counter */}
      <div className="w-96 flex flex-col bg-[#FBFBF9] border-l border-[#E5E7EB]">
        {/* Customer Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A192F]">
              Customer Assignment
            </span>
            <div className="flex items-center gap-1 border border-[#E5E7EB] p-0.5">
              <button
                type="button"
                onClick={() => setCustomerType('WALK_IN')}
                className={`text-[10px] font-bold px-2 py-0.5 ${
                  customerType === 'WALK_IN' ? 'bg-[#0A192F] text-white' : 'text-[#6B7280]'
                }`}
              >
                Walk-In
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('MEMBER')}
                className={`text-[10px] font-bold px-2 py-0.5 ${
                  customerType === 'MEMBER' ? 'bg-[#0A192F] text-white' : 'text-[#6B7280]'
                }`}
              >
                Member
              </button>
            </div>
          </div>

          {customerType === 'WALK_IN' ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Walk-in Name"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none"
              />
              <Input
                placeholder="Phone (optional)"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="Type member name or mobile..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none"
              />
              {members.length > 0 && !selectedMemberId && (
                <div className="border border-[#E5E7EB] bg-white max-h-28 overflow-y-auto divide-y divide-[#E5E7EB]">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setMemberSearch(m.fullName);
                        setMembers([]);
                      }}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-[#F5F5F0] flex justify-between"
                    >
                      <span className="font-bold">{m.fullName}</span>
                      <span className="font-mono text-[#6B7280]">{m.mobileNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#6B7280]">
              <span className="font-mono text-2xl mb-1">🛒</span>
              Cart is currently empty.
              <br />
              Click products on the left to add items.
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.product.id}
                className="p-3 bg-white border border-[#E5E7EB] flex items-center justify-between"
              >
                <div className="flex-1 pr-2">
                  <div className="text-xs font-bold text-[#0A192F] line-clamp-1">
                    {item.product.name}
                  </div>
                  <div className="text-[10px] text-[#6B7280] font-mono">
                    {formatPaiseToInr(item.unitPriceInPaise)} × {item.quantity}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="px-2 py-0.5 text-xs text-[#0A192F] hover:bg-[#F5F5F0]"
                    >
                      -
                    </button>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="px-2 py-0.5 text-xs text-[#0A192F] hover:bg-[#F5F5F0]"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-mono font-bold text-xs text-[#0A192F] w-16 text-right">
                    {formatPaiseToInr(item.unitPriceInPaise * item.quantity)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing & Tender Checkout Box */}
        <div className="p-4 border-t border-[#E5E7EB] bg-white space-y-3">
          {checkoutError && (
            <div className="p-2 border border-red-200 bg-red-50 text-[11px] text-[#B91C1C]">
              {checkoutError}
            </div>
          )}

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal:</span>
              <span className="font-mono">{formatPaiseToInr(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Taxes (GST):</span>
              <span className="font-mono">{formatPaiseToInr(taxPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#0A192F] pt-1 border-t border-[#E5E7EB]">
              <span>Total Payable:</span>
              <span className="font-mono">{formatPaiseToInr(grandTotalPaise)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Payment Method
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[PaymentMethodType.UPI, PaymentMethodType.CASH, PaymentMethodType.CARD_MANUAL].map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 text-xs font-bold border transition-colors ${
                      paymentMethod === m
                        ? 'bg-[#0A192F] text-white border-[#0A192F]'
                        : 'bg-white text-[#0A192F] border-[#E5E7EB] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    {m.replace(/_/g, ' ')}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Cash Tendered Input */}
          {paymentMethod === PaymentMethodType.CASH && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#0A192F]">Cash Tendered (₹):</span>
                {changeDuePaise > 0 && (
                  <span className="font-mono font-bold text-emerald-700">
                    Change: {formatPaiseToInr(changeDuePaise)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                min="0"
                step="1"
                value={cashTenderedPaise ? (cashTenderedPaise / 100).toFixed(0) : ''}
                onChange={(e) =>
                  setCashTenderedPaise(Math.round(parseFloat(e.target.value || '0') * 100))
                }
                placeholder="Amount given by customer"
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
              />
            </div>
          )}

          {paymentMethod === PaymentMethodType.UPI && (
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="UPI Ref / UTR / Transaction ID (optional)"
              className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
            />
          )}

          <Button
            type="button"
            disabled={cart.length === 0 || isCheckingOut}
            onClick={handleCheckout}
            className="w-full bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs h-10 font-bold uppercase tracking-wider rounded-none"
          >
            {isCheckingOut ? 'Recording Sale...' : `Charge ${formatPaiseToInr(grandTotalPaise)}`}
          </Button>
        </div>
      </div>

      {/* Sale Success Receipt Modal */}
      {lastCompletedSale && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="text-emerald-700 text-3xl font-mono">✓</div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Sale Completed
              </h2>
              <p className="text-xs text-[#6B7280]">
                Invoice #{lastCompletedSale.invoice?.invoiceNumber || lastCompletedSale.id?.slice(0, 8)}
              </p>
            </div>

            <div className="border border-[#E5E7EB] bg-white p-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Total Charged:</span>
                <span className="font-bold text-[#0A192F]">
                  {formatPaiseToInr(lastCompletedSale.grandTotalInPaise || lastCompletedSale.invoice?.grandTotalInPaise || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Method:</span>
                <span>{lastCompletedSale.paymentMethod || 'PAID'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setLastCompletedSale(null)}
                className="flex-1 text-xs border-[#E5E7EB] rounded-none h-8"
              >
                New Sale
              </Button>
              <Button
                onClick={() => navigate(`/pos/sales/${lastCompletedSale.id}`)}
                className="flex-1 bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 font-bold"
              >
                Inspect Receipt
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
