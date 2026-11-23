import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { InvoiceStatus, PaymentMethodType, UserRole } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { formatPaiseToInr } from '../../lib/utils';

export function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick Collect Payment Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: PaymentMethodType.UPI,
    referenceNumber: '',
    notes: '',
  });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await apiClient.get(`/billing/invoices?${params.toString()}`);
      setInvoices(res.data.data.items || []);
      setTotalPages(res.data.data.meta.totalPages || 1);
      setTotalCount(res.data.data.meta.total || 0);
    } catch {
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleOpenCollect = (inv: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(inv);
    setPaymentForm({
      amountRupees: (inv.balanceDueInPaise / 100).toString(),
      method: PaymentMethodType.UPI,
      referenceNumber: '',
      notes: `Settlement for Invoice ${inv.invoiceNumber}`,
    });
    setIsCollectModalOpen(true);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountInPaise = Math.round(parseFloat(paymentForm.amountRupees) * 100);
    if (amountInPaise <= 0 || isNaN(amountInPaise)) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      await apiClient.post('/billing/payments', {
        memberId: selectedInvoice.member.id,
        branchId: selectedInvoice.branchId,
        amountInPaise,
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
        allocations: [
          {
            invoiceId: selectedInvoice.id,
            amountInPaise: Math.min(amountInPaise, selectedInvoice.balanceDueInPaise),
          },
        ],
      });

      setIsCollectModalOpen(false);
      fetchInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment collection failed';
      alert(`Collection failed: ${msg}`);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-none">
            PAID
          </span>
        );
      case InvoiceStatus.PARTIALLY_PAID:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-none">
            PARTIAL
          </span>
        );
      case InvoiceStatus.OVERDUE:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 rounded-none">
            OVERDUE
          </span>
        );
      case InvoiceStatus.VOID:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300 rounded-none">
            VOID
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-none">
            {status}
          </span>
        );
    }
  };

  const isManagement =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.FRONT_DESK;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Tax Invoices</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Authoritative financial records with GST line items, itemized services, and collection logs.
          </p>
        </div>
        {isManagement && (
          <Button
            onClick={() => navigate('/billing/invoices/new')}
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-4 font-semibold"
          >
            Issue New Invoice
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Search invoice number, member name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs h-9 rounded-none border-[#E5E7EB]"
          />
          <Button type="submit" variant="outline" className="rounded-none text-xs h-9 px-4">
            Filter
          </Button>
        </form>

        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 text-xs border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none rounded-none"
        >
          <option value="">All Invoices</option>
          <option value="ISSUED">Issued / Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Fully Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="VOID">Voided</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                    className="hover:bg-[#F5F5F0] cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-[#0A192F]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold">{inv.member.fullName}</td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      {inv.invoiceDate.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6B7280]">
                      {inv.dueDate.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {formatPaiseToInr(inv.grandTotalInPaise)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700">
                      {formatPaiseToInr(inv.paidAmountInPaise)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-red-700">
                      {formatPaiseToInr(inv.balanceDueInPaise)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      {inv.balanceDueInPaise > 0 && inv.status !== 'VOID' && isManagement && (
                        <Button
                          size="sm"
                          onClick={(e) => handleOpenCollect(inv, e)}
                          className="rounded-none text-[11px] h-7 px-3 bg-[#0A192F] text-[#FBFBF9]"
                        >
                          Collect Payment
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                        className="rounded-none text-[11px] h-7 border-[#E5E7EB]"
                      >
                        View
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-semibold text-[#111827]">{invoices.length}</span> of{' '}
            <span className="font-semibold text-[#111827]">{totalCount}</span> invoices
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-none h-7 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-none h-7 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* QUICK COLLECT PAYMENT MODAL */}
      {isCollectModalOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Collect Payment: {selectedInvoice.invoiceNumber}
            </h3>
            <div className="text-xs text-[#4B5563] space-y-1 bg-[#F5F5F0] p-3 border border-[#E5E7EB]">
              <p>Member: <strong className="text-[#111827]">{selectedInvoice.member.fullName}</strong></p>
              <p>Invoice Total: <strong>{formatPaiseToInr(selectedInvoice.grandTotalInPaise)}</strong></p>
              <p>Outstanding Balance: <strong className="text-red-700">{formatPaiseToInr(selectedInvoice.balanceDueInPaise)}</strong></p>
            </div>

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
                  placeholder="e.g. UPI UTR, Cheque No, or Card Approval Code"
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                  }
                  className="rounded-none text-xs h-9"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Internal Collection Notes</label>
                <Input
                  placeholder="Optional cashier notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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
                  Confirm Collection & Issue Receipt
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


