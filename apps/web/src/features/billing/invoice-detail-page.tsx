  import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { PaymentMethodType, UserRole } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { formatPaiseToInr } from '../../lib/utils';
import { printHtmlElement } from '../../lib/print-document';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailing, setIsEmailing] = useState(false);
  const emailInvoice = async () => {
    setIsEmailing(true);
    try {
      const response = await apiClient.post(`/billing/invoices/${id}/email`, {}, { timeout: 60000 });
      const result = response.data.data || response.data;
      alert(result.success && result.mode === 'smtp' ? 'Invoice email sent with PDF attachment.' : result.reason || 'Email was not delivered. Please check SMTP configuration.');
    } catch (error) { alert(error instanceof Error ? error.message : 'Invoice email failed'); }
    finally { setIsEmailing(false); }
  };

  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: PaymentMethodType.UPI,
    referenceNumber: '',
    notes: '',
  });
  const [voidReason, setVoidReason] = useState('');

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/billing/invoices/${id}`);
      setInvoice(res.data.data);
      if (res.data.data) {
        setPaymentForm((prev) => ({
          ...prev,
          amountRupees: (res.data.data.balanceDueInPaise / 100).toString(),
        }));
      }
    } catch {
      setInvoice(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amountInPaise = Math.round(parseFloat(paymentForm.amountRupees) * 100);
    if (amountInPaise <= 0 || isNaN(amountInPaise)) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      await apiClient.post('/billing/payments', {
        memberId: invoice.member.id,
        branchId: invoice.branchId,
        amountInPaise,
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
        allocations: [
          {
            invoiceId: invoice.id,
            amountInPaise: Math.min(amountInPaise, invoice.balanceDueInPaise),
          },
        ],
      });

      setIsCollectModalOpen(false);
      fetchInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment collection failed';
      alert(`Collection failed: ${msg}`);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      alert('Please provide a mandatory reason for voiding this invoice.');
      return;
    }

    try {
      await apiClient.post(`/billing/invoices/${id}/void`, { voidReason });
      setIsVoidModalOpen(false);
      fetchInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Void failed';
      alert(`Void operation failed: ${msg}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center text-xs text-[#6B7280]">
        <h2 className="text-sm font-bold text-[#0A192F]">Invoice Not Found</h2>
        <Button onClick={() => navigate('/billing/invoices')} className="mt-4 rounded-none text-xs">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isManagement =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.FRONT_DESK;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/billing/invoices')}
          className="rounded-none text-xs border-[#E5E7EB]"
        >
          Back to Invoices
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printHtmlElement('printable-invoice-document', `Invoice_${invoice.invoiceNumber}`)}
            className="rounded-none text-xs border-[#E5E7EB] bg-white text-[#0A192F] hover:bg-[#F5F5F0] inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-[#0A192F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Tax Invoice (A4)
          </Button>

          {invoice.balanceDueInPaise > 0 && invoice.status !== 'VOID' && isManagement && (
            <Button
              size="sm"
              onClick={() => setIsCollectModalOpen(true)}
              className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs px-4 font-semibold"
            >
              Collect Payment
            </Button>
          )}

          {invoice.paidAmountInPaise === 0 && invoice.status !== 'VOID' && isManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVoidModalOpen(true)}
              className="rounded-none text-xs border-red-300 text-red-700 hover:bg-red-50"
            >
              Void Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="print:hidden flex justify-end"><Button type="button" variant="outline" disabled={isEmailing || !invoice.member.email} onClick={emailInvoice} className="rounded-none text-xs">{isEmailing ? 'Sending invoice...' : 'Email Invoice PDF'}</Button></div>
      {/* Official Tax Invoice Document Canvas */}
      <div id="printable-invoice-document" className="bg-[#FBFBF9] border border-[#E5E7EB] p-8 md:p-12 text-[#111827] space-y-6 printable-document print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Header Section */}
        <div className="border-b-2 border-[#0A192F] pb-4 flex flex-col md:flex-row print:flex-row justify-between items-start gap-4 print-avoid-break">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {invoice.tenant.logoUrl ? (
              <img
                src={invoice.tenant.logoUrl}
                alt="Brand Logo"
                className="h-16 w-16 object-contain rounded-none border border-[#E5E7EB] bg-white p-1 flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 bg-[#0A192F] text-white flex items-center justify-center font-bold text-lg rounded-none flex-shrink-0">
                {invoice.tenant.name?.charAt(0) || 'F'}
              </div>
            )}
            <div className="min-w-0 break-words">
              <h1 className="font-extrabold text-xl tracking-wider text-[#0A192F] uppercase">
                {invoice.tenant.name}
              </h1>
              <p className="text-xs text-[#374151] mt-0.5">
                {invoice.tenant.address}, {invoice.tenant.city}, {invoice.tenant.state} - {invoice.tenant.pincode}
              </p>
              <p className="text-[11px] text-[#4B5563] mt-0.5">
                Facility Branch: {invoice.branch.name} | {invoice.branch.address}, {invoice.branch.city}
              </p>
              <div className="text-[11px] font-mono text-[#6B7280] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>Phone: <strong className="text-[#111827]">{invoice.tenant.phone || '-'}</strong></span>
                <span>Email: <strong className="text-[#111827]">{invoice.tenant.email || '-'}</strong></span>
                {invoice.tenant.website && <span>Web: <strong className="text-[#111827]">{invoice.tenant.website}</strong></span>}
              </div>
              <div className="text-[11px] font-mono text-[#6B7280] mt-0.5 flex flex-wrap gap-x-3">
                <span>GSTIN: <strong className="text-[#0A192F]">{invoice.tenant.gstin || 'N/A'}</strong></span>
                <span>PAN: <strong className="text-[#0A192F]">{invoice.tenant.pan || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="inline-block bg-[#0A192F] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 mb-1">
              TAX INVOICE (ORIGINAL)
            </div>
            <div className="text-lg font-mono font-extrabold text-[#0A192F]">
              {invoice.invoiceNumber}
            </div>
            <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">
              Invoice Date: <strong className="text-[#111827]">{invoice.invoiceDate.split('T')[0]}</strong>
            </div>
            <div className="text-[11px] text-[#6B7280] font-mono">
              Due Date: <strong className="text-[#B91C1C]">{invoice.dueDate.split('T')[0]}</strong>
            </div>
            <div className="mt-1">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-none uppercase ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {invoice.membership && <section className="border border-[#E5E7EB] bg-[#F5F5F0] p-4 text-xs space-y-2 print-avoid-break"><h2 className="font-bold text-[#0A192F]">Membership details</h2><p>Plan: <strong>{invoice.membership.plan?.name}</strong></p><p>Valid from: <strong>{invoice.membership.startDate.split('T')[0]}</strong> | Valid until: <strong>{invoice.membership.endDate.split('T')[0]}</strong></p><p>Membership status: <strong>{invoice.membership.status}</strong></p><p>Payment arrangement: <strong>{invoice.balanceDueInPaise <= 0 ? 'Full Settlement' : invoice.paidAmountInPaise > 0 ? 'Installment / Partial Payment' : 'Pay Later'}</strong></p></section>}
        {/* Bill To & Invoice Dates */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#6B7280] text-[10px]">
              Bill To
            </span>
            <p className="font-bold text-sm text-[#0A192F]">{invoice.member.fullName}</p>
            <p className="font-mono text-[#4B5563]">Member Code: {invoice.member.memberCode}</p>
            <p className="text-[#4B5563]">Phone: {invoice.member.phone}</p>
            {invoice.member.email && <p className="text-[#4B5563]">Email: {invoice.member.email}</p>}
            {invoice.member.address && (
              <p className="text-[#6B7280]">
                {invoice.member.address.addressLine1}, {invoice.member.address.city}
              </p>
            )}
          </div>

          <div className="text-right space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#6B7280] text-[10px]">
              Invoice Metadata
            </span>
            <p>
              Invoice Date: <strong>{invoice.invoiceDate.split('T')[0]}</strong>
            </p>
            <p className="font-mono">
              Due Date: <strong className="text-red-700">{invoice.dueDate.split('T')[0]}</strong>
            </p>
            {invoice.voidReason && (
              <p className="text-red-700 font-semibold italic">Void Reason: {invoice.voidReason}</p>
            )}
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="border border-[#E5E7EB]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Unit Rate</th>
                <th className="py-2.5 px-3">GST Rate</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {invoice.lineItems.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2.5 px-3 font-semibold text-[#111827]">
                    {item.description}
                  </td>
                  <td className="py-2.5 px-3 text-[#6B7280]">{item.itemType}</td>
                  <td className="py-2.5 px-3">{item.quantity}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {formatPaiseToInr(item.unitPriceInPaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#4B5563]">
                    {(item.taxRateBps / 100).toFixed(1)}% GST
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    {formatPaiseToInr(item.totalAmountInPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals */}
        <div className="flex justify-end text-xs">
          <div className="w-64 space-y-1.5 border border-[#E5E7EB] bg-[#F5F5F0] p-4">
            <div className="flex justify-between text-[#4B5563]">
              <span>Taxable Subtotal:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.subtotalInPaise)}</span>
            </div>
            <div className="flex justify-between text-[#4B5563]">
              <span>Total GST:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.taxAmountInPaise)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#0A192F] pt-2 border-t border-[#E5E7EB]">
              <span>Grand Total:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.grandTotalInPaise)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-semibold">
              <span>Amount Settled:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.paidAmountInPaise)}</span>
            </div>
            <div className="flex justify-between text-red-700 font-bold pt-1 border-t border-[#E5E7EB]">
              <span>Outstanding Due:</span>
              <span className="font-mono">{formatPaiseToInr(invoice.balanceDueInPaise)}</span>
            </div>
          </div>
        </div>

        {/* Payment Allocations Ledger */}
        {invoice.allocations?.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Payment Allocations & Receipt History
            </h3>
            <div className="overflow-x-auto border border-[#E5E7EB]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F5F0] text-[10px] uppercase font-semibold text-[#4B5563]">
                  <tr>
                    <th className="py-2 px-3">Payment #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3 text-right">Allocated Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {invoice.allocations.map((a: any) => (
                    <tr key={a.id}>
                      <td className="py-2 px-3 font-mono font-semibold text-[#0A192F]">
                        {a.payment.paymentNumber}
                      </td>
                      <td className="py-2 px-3 text-[#6B7280]">
                        {a.payment.paymentDate.split('T')[0]}
                      </td>
                      <td className="py-2 px-3 font-semibold">{a.payment.method}</td>
                      <td className="py-2 px-3 font-mono text-[#6B7280]">
                        {a.payment.referenceNumber || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        {formatPaiseToInr(a.allocatedInPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Terms & Official Footer */}
        <div className="pt-6 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-4 print-avoid-break">
          {invoice.notes && (
            <p className="bg-[#F5F5F0] p-2.5 border border-[#E5E7EB] text-[#374151]">
              <strong>Special Instructions & Billing Notes: </strong>
              {invoice.notes}
            </p>
          )}

          {/* Social and Communication Contact Row */}
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-[#374151]">
              {invoice.tenant.whatsapp && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="font-bold text-[#0A192F]">WhatsApp:</span> {invoice.tenant.whatsapp}
                </span>
              )}
              {invoice.tenant.instagram && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="font-bold text-[#0A192F]">Instagram:</span> {invoice.tenant.instagram}
                </span>
              )}
              {invoice.tenant.website && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="font-bold text-[#0A192F]">Web:</span> {invoice.tenant.website}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="font-bold text-[#0A192F]">Helpdesk:</span> {invoice.tenant.email || invoice.tenant.phone}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#6B7280]">
              Currency: {invoice.tenant.currency || 'INR'} | Timezone: {invoice.tenant.timezone || 'Asia/Kolkata'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-6 text-xs text-[#111827]">
            <div className="border-t border-[#111827] pt-2">
              <p className="font-bold">Member / Subscriber Signature</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">I agree to gym facility regulations and payment terms.</p>
            </div>
            <div className="border-t border-[#111827] pt-2 text-right">
              <p className="font-bold">Authorized Signatory - {invoice.tenant.name}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">Computer-generated official tax invoice under GST laws.</p>
            </div>
          </div>
        </div>
      </div>

      {/* COLLECT PAYMENT MODAL */}
      {isCollectModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Collect Payment: {invoice.invoiceNumber}
            </h3>
            <form onSubmit={handleCollectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Collection Amount in ₹ *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amountRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                  required
                  className="rounded-none text-xs h-9"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Payment Method *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethodType })
                  }
                  className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                >
                  <option value={PaymentMethodType.UPI}>UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value={PaymentMethodType.CASH}>Cash (Front Desk Drawer)</option>
                  <option value={PaymentMethodType.BANK_TRANSFER}>Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value={PaymentMethodType.CARD_MANUAL}>Card (POS Swipe Machine)</option>
                  <option value={PaymentMethodType.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Transaction Reference / UTR Number</label>
                <Input
                  placeholder="e.g. UPI UTR or Cheque No"
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                  }
                  className="rounded-none text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#B91C1C] text-[#FBFBF9] rounded-none text-xs font-semibold">
                  Confirm Collection
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VOID INVOICE MODAL */}
      {isVoidModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 pb-1">
              Void Invoice: {invoice.invoiceNumber}
            </h3>
            <form onSubmit={handleVoidSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mandatory Reason for Voiding *</label>
                <textarea
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                  placeholder="Explain why this invoice is being marked void..."
                  className="w-full p-2 border border-[#E5E7EB] bg-[#FBFBF9] rounded-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-700 text-[#FBFBF9] rounded-none text-xs">
                  Confirm Void
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


