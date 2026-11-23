import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { PaymentMethodType } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { printHtmlElement } from '../../lib/print-document';

const mediaUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${window.location.origin}/${url.replace(/^\/+/, '')}`;
};

export function PosSaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [sale, setSale] = useState<any | null>(null);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<
    Array<{ invoiceLineItemId: string; quantity: number; reason: string }>
  >([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethodType>(PaymentMethodType.CASH);
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const fetchSale = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/pos/sales/${id}`);
      const invoice = res.data.data;
      try {
        const productsRes = await apiClient.get('/inventory/products?limit=100');
        const products = productsRes.data?.data?.items || [];
        const enriched = (invoice.lineItems || []).map((line: any) => {
          const sku = String(line.description || '').match(/\(([^)]+)\)$/)?.[1];
          const product = products.find((item: any) => item.id === line.referenceId || item.sku === sku);
          return { ...line, product: product || line.product || null };
        });
        setSale({ ...invoice, lineItems: enriched });
      } catch {
        setSale(invoice);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSale();
  }, [id]);

  useEffect(() => {
    if (!sale || new URLSearchParams(window.location.search).get('print') !== '1') return;
    const timer = window.setTimeout(() => {
      const customerName = sale.member?.fullName || sale.walkInCustomerName || 'Customer';
      const safePart = (value: string) => value.replace(/[^a-z0-9]+/gi, ' ').trim();
      printHtmlElement('printable-pos-invoice', `Invoice - ${safePart('Trifit Elite Fitness & Sports Club')} - ${safePart(customerName)}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [sale]);

  const openReturnModal = () => {
    const invoice = sale?.invoice || sale;
    if (!invoice?.lineItems) return;
    setReturnItems(
      invoice.lineItems.map((li: any) => ({
        invoiceLineItemId: li.id,
        quantity: 0,
        reason: 'Customer return',
      })),
    );
    setReturnError(null);
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToReturn = returnItems.filter((item) => item.quantity > 0);
    if (itemsToReturn.length === 0) {
      setReturnError('Please specify a return quantity of at least 1 item.');
      return;
    }

    setIsReturning(true);
    setReturnError(null);
    try {
      await apiClient.post(`/pos/sales/${id}/return`, {
        items: itemsToReturn,
        refundMethod,
      });
      setIsReturnModalOpen(false);
      fetchSale();
    } catch (err: any) {
      setReturnError(err?.response?.data?.message || 'Failed to process return');
    } finally {
      setIsReturning(false);
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

  if (!sale) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="text-xs text-[#6B7280]">Sale transaction not found.</div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none"
          onClick={() => navigate('/pos/sales')}
        >
          ← Back to Sales
        </Button>
      </div>
    );
  }

  const invoice = sale.invoice || sale;
  const isRefunded = invoice.status === 'REFUNDED';

  return (
    <div className="bg-[#F5F5F0] min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Invoice #{invoice.invoiceNumber || sale.id.slice(0, 8)}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                isRefunded
                  ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {invoice.status || 'PAID'}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Processed on {new Date(sale.createdAt).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const customerName = sale.member?.fullName || sale.walkInCustomerName || 'Customer';
            const phone = sale.member?.mobileNumber || sale.member?.phone || sale.walkInCustomerPhone;
            const email = sale.member?.email || sale.walkInCustomerEmail;
            const detailUrl = `${window.location.origin}/pos/sales/${id}`;
            const itemLines = (invoice.lineItems || []).map((item: any) => `- ${item.description} | Qty: ${item.quantity} | ${formatPaiseToInr(item.totalAmountInPaise || 0)}`).join('\n');
            const shareText = `Hello ${customerName},\n\nYour invoice ${invoice.invoiceNumber || ''} from ${tenant?.name || 'Trifit'} is ready.\n\nItems:\n${itemLines}\n\nSubtotal: ${formatPaiseToInr(invoice.subtotalInPaise || 0)}\nGST: ${formatPaiseToInr(invoice.taxAmountInPaise || 0)}\nTotal paid: ${formatPaiseToInr(invoice.grandTotalInPaise || 0)}\nPayment: ${sale.paymentMethod || invoice.paymentMethod || 'CASH'}\n\nView or download your invoice here:\n${detailUrl}`;
            return <>
              {phone && <Button type="button" variant="outline" className="text-xs border-[#A7F3D0] text-[#047857] rounded-none inline-flex items-center gap-1.5" onClick={() => window.open(`https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(shareText)}`, '_blank')}><span aria-hidden="true"></span> WhatsApp</Button>}
              {email && <Button type="button" variant="outline" className="text-xs border-[#FECACA] text-[#B91C1C] rounded-none inline-flex items-center gap-1.5" onClick={() => { window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Invoice ${invoice.invoiceNumber || ''} - ${tenant?.name || 'Trifit'}`)}&body=${encodeURIComponent(shareText)}`; }}><span aria-hidden="true"></span> Email</Button>}
            </>;
          })()}
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/pos/sales')}
          >
            ← Sales History
          </Button>
          {!isRefunded && (
            <Button
              variant="outline"
              className="text-xs border-red-200 text-[#B91C1C] hover:bg-red-50 rounded-none"
              onClick={openReturnModal}
            >
              Process Return / Refund
            </Button>
          )}
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => {
              const customerName = sale.member?.fullName || sale.walkInCustomerName || 'Customer';
              const gymName = tenant?.name || 'Trifit Elite Fitness & Sports Club';
              const safePart = (value: string) => value.replace(/[^a-z0-9]+/gi, ' ').trim();
              printHtmlElement('printable-pos-invoice', `Invoice - ${safePart(gymName)} - ${safePart(customerName)}`);
            }}
          >
            Print Tax Receipt
          </Button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div id="printable-pos-invoice" className="invoice-print-canvas max-w-4xl mx-auto bg-[#FBFBF9] border border-[#E5E7EB] p-8 md:p-12 space-y-6 text-[#111827] printable-document print:border-none print:p-0 print:max-w-none">
        <div className="border-b-2 border-[#0A192F] pb-6 mb-3 flex justify-between gap-6">
          <div className="flex gap-3 items-start">
            {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="Brand logo" className="h-16 w-16 object-contain border border-[#E5E7EB] p-1" /> : <div className="h-16 w-16 bg-[#0A192F] text-white flex items-center justify-center text-xl font-bold">{(tenant?.name || 'F').charAt(0)}</div>}
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-wider text-[#0A192F]">{tenant?.name || 'Trifit Elite Fitness & Sports Club'}</h2>
              <p className="text-xs text-[#374151]">{tenant?.address}, {tenant?.city}, {tenant?.state} - {tenant?.pincode}</p>
              <p className="text-[11px] text-[#6B7280]">Phone: {tenant?.phone || '-'} | Email: {tenant?.email || '-'}</p>
              <p className="text-[11px] text-[#6B7280]">GSTIN: {tenant?.gstin || 'N/A'} | PAN: {tenant?.pan || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono"><div className="font-bold tracking-widest text-[#0A192F]">TAX INVOICE</div><p className="mt-2">Invoice: {invoice.invoiceNumber || sale.id.slice(0, 8)}</p><p>{new Date(sale.createdAt).toLocaleDateString('en-IN')}</p></div>
        </div>
        {/* Customer & Transaction Meta */}
        <div className="grid grid-cols-2 gap-6 border-b border-[#E5E7EB] pb-6 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Customer Details
            </div>
            <div className="mt-1 font-bold text-[#0A192F] text-sm">
              {sale.member ? sale.member.fullName : sale.walkInCustomerName || 'Walk-in Retail Customer'}
            </div>
            <div className="text-[#6B7280] font-mono mt-0.5">
              {sale.member ? (sale.member.mobileNumber || sale.member.phone || sale.member.email || 'No contact provided') : sale.walkInCustomerPhone || 'No contact provided'}
            </div>
            {(sale.member?.email || sale.walkInCustomerEmail) && <div className="text-[#6B7280] mt-0.5">{sale.member?.email || sale.walkInCustomerEmail}</div>}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Tender Details
            </div>
            <div className="mt-1 font-bold text-[#0A192F]">
              Method: {sale.paymentMethod || invoice.paymentMethod || sale.allocations?.[0]?.payment?.method || 'CASH'}
            </div>
            {sale.paymentReference && (
              <div className="text-[#6B7280] font-mono text-[11px] mt-0.5">
                Ref: {sale.paymentReference}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {(invoice.lineItems || []).map((li: any) => (
                <tr key={li.id}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {li.product?.photoUrl ? <img src={mediaUrl(li.product.photoUrl)} alt={li.description} className="h-14 w-14 object-contain border border-[#E5E7EB] bg-[#F5F5F0]" /> : <div className="h-14 w-14 flex items-center justify-center border border-[#E5E7EB] bg-[#0A192F] text-[#FBFBF9] text-xl font-bold">{String(li.description || 'P').charAt(0)}</div>}
                      {(() => { const targetId = li.product?.id || li.referenceId; return targetId ? <a href={`/inventory/products/${targetId}`} onClick={(event) => { event.preventDefault(); navigate(`/inventory/products/${targetId}`); }} className="font-bold text-left text-[#0A192F] hover:underline">{li.description}</a> : <span className="font-bold text-[#0A192F]">{li.description}</span>; })()}
                    </div>
                    {li.hsnSac && (
                      <div className="font-mono text-[10px] text-[#6B7280]">HSN: {li.hsnSac}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#6B7280]">
                    {formatPaiseToInr(li.unitPriceInPaise)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[#0A192F]">
                    {li.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#6B7280]">
                    {li.taxRatePercentage ?? (Number(li.taxRateBps || 0) / 100)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#0A192F]">
                    {formatPaiseToInr(li.totalAmountInPaise ?? li.totalInPaise ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.subtotalInPaise || 0)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Taxes (CGST + SGST):</span>
              <span className="font-mono">{formatPaiseToInr(invoice.taxAmountInPaise || 0)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#0A192F] pt-2 border-t border-[#E5E7EB]">
              <span>Grand Total:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.grandTotalInPaise || 0)}</span>
            </div>
          </div>
        </div>
        <div className="invoice-footer mt-auto border-t border-[#0A192F] pt-4 text-[11px] text-[#4B5563] flex justify-between gap-4 print-avoid-break">
          <span>Phone: {tenant?.phone || '-'} | Email: {tenant?.email || '-'}<br />{tenant?.website || ''} {tenant?.whatsapp ? `| WhatsApp: ${tenant.whatsapp}` : ''}</span>
          <span className="text-right">Thank you for choosing {tenant?.name || 'Trifit'}.<br />This is a computer-generated invoice and does not require a signature.</span>
        </div>
      </div>

      {/* Return / Refund Modal */}
      {isReturnModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Process POS Return & Restock
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
                onClick={() => setIsReturnModalOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {returnError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {returnError}
              </div>
            )}

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div className="space-y-2 border border-[#E5E7EB] p-3 bg-white">
                <div className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider grid grid-cols-12 gap-2 pb-1 border-b border-[#E5E7EB]">
                  <div className="col-span-8">Product Item</div>
                  <div className="col-span-4 text-right">Return Qty</div>
                </div>

                {(invoice.lineItems || []).map((li: any, idx: number) => (
                  <div key={li.id} className="grid grid-cols-12 gap-2 items-center text-xs py-1">
                    <div className="col-span-8">
                      <div className="font-bold text-[#0A192F]">{li.description}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">
                        Purchased: {li.quantity}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min="0"
                        max={li.quantity}
                        value={returnItems[idx]?.quantity || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          const updated = [...returnItems];
                          updated[idx] = {
                            invoiceLineItemId: li.id,
                            quantity: val,
                            reason: 'Customer return',
                          };
                          setReturnItems(updated);
                        }}
                        className="text-xs text-right border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Refund Tender Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[PaymentMethodType.CASH, PaymentMethodType.UPI, PaymentMethodType.CARD_MANUAL].map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRefundMethod(m)}
                        className={`py-1.5 text-xs font-bold border transition-colors ${
                          refundMethod === m
                            ? 'bg-[#0A192F] text-white border-[#0A192F]'
                            : 'bg-white text-[#0A192F] border-[#E5E7EB] hover:bg-[#F5F5F0]'
                        }`}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isReturning}
                  className="bg-[#B91C1C] text-white hover:bg-red-800 text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isReturning ? 'Processing Return...' : 'Execute Restock & Refund'}
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


