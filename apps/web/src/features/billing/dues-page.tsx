import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { PaymentMethodType } from '@fitnexa/shared';
import { formatPaiseToInr, parseInrToPaise } from '../../lib/utils';

export function DuesPage() {
  const navigate = useNavigate();

  const [duesData, setDuesData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAging, setSelectedAging] = useState<string>('');

  // Collect Payment Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: PaymentMethodType.UPI,
    referenceNumber: '',
    notes: '',
  });

  // Extend Due Date Modal
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendForm, setExtendForm] = useState({
    newDueDate: '',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchDues = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAging) params.append('agingBucket', selectedAging);

      const res = await apiClient.get(`/billing/dues?${params.toString()}`);
      const payload = res.data?.data || res.data;
      setDuesData(payload?.items || []);
      setSummary(payload?.summary || null);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [selectedAging]);

  const handleOpenCollectModal = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentForm({
      amountRupees: (inv.balanceDueInPaise / 100).toFixed(2),
      method: PaymentMethodType.UPI,
      referenceNumber: '',
      notes: '',
    });
    setActionError('');
    setIsCollectModalOpen(true);
  };

  const handleOpenExtendModal = (inv: any) => {
    setSelectedInvoice(inv);
    const currentDue = new Date(inv.dueDate);
    const defaultNext = new Date(currentDue.getTime() + 7 * 86400000).toISOString().split('T')[0];
    setExtendForm({
      newDueDate: defaultNext,
      reason: '',
    });
    setActionError('');
    setIsExtendModalOpen(true);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountInPaise = parseInrToPaise(paymentForm.amountRupees);
    if (amountInPaise <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }

    if (amountInPaise > selectedInvoice.balanceDueInPaise) {
      setActionError(
        `Allocation cannot exceed outstanding balance of ${formatPaiseToInr(selectedInvoice.balanceDueInPaise)}.`,
      );
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        memberId: selectedInvoice.memberId,
        branchId: selectedInvoice.branchId,
        amountInPaise,
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
        allocations: [
          {
            invoiceId: selectedInvoice.id,
            amountInPaise,
          },
        ],
      };

      const res = await apiClient.post('/billing/payments', payload);
      if (res.data.success) {
        setIsCollectModalOpen(false);
        fetchDues();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (!extendForm.newDueDate) {
      setActionError('New due date is required.');
      return;
    }

    if (!extendForm.reason.trim()) {
      setActionError('Audit reason for due date extension is required.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        newDueDate: extendForm.newDueDate,
        reason: extendForm.reason,
      };

      const res = await apiClient.post(`/billing/dues/${selectedInvoice.id}/extend-due-date`, payload);
      if (res.data.success) {
        setIsExtendModalOpen(false);
        fetchDues();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to extend due date');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgingBadge = (bucket: string) => {
    switch (bucket) {
      case 'NOT_DUE':
        return { label: 'Current / Not Due', style: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]' };
      case 'OVERDUE_1_7':
        return { label: '1 - 7 Days Overdue', style: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' };
      case 'OVERDUE_8_30':
        return { label: '8 - 30 Days Overdue', style: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]' };
      case 'OVERDUE_31_60':
        return { label: '31 - 60 Days Overdue', style: 'bg-[#B91C1C] text-[#FBFBF9] border-[#991B1B]' };
      case 'OVERDUE_60_PLUS':
        return { label: '60+ Days Critical', style: 'bg-[#0A192F] text-[#FBFBF9] border-[#0F223D]' };
      default:
        return { label: bucket, style: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]' };
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Dues & Aging Ledger</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time aging analysis and recovery tracking for outstanding membership balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#0A192F] text-[#0A192F] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/billing/invoices')}
          >
            Invoices Directory
          </Button>
          <Button
            variant="primary"
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none"
            onClick={() => navigate('/billing')}
          >
            Billing Dashboard
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Total Outstanding Balance
          </div>
          <div className="text-2xl font-bold font-mono text-[#B91C1C] mt-2">
            {formatPaiseToInr(summary?.totalOutstandingPaise || 0)}
          </div>
          <div className="text-[10px] text-[#6B7280] mt-1">
            Across {summary?.totalInvoicesWithDues || 0} unpaid invoices
          </div>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Overdue Invoices
          </div>
          <div className="text-2xl font-bold font-mono text-[#0A192F] mt-2">
            {summary?.overdueInvoicesCount || 0}
          </div>
          <div className="text-[10px] text-[#DC2626] mt-1 font-semibold">
            Passed payment due date
          </div>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            1-30 Days Delinquency
          </div>
          <div className="text-2xl font-bold font-mono text-[#B45309] mt-2">
            {formatPaiseToInr(
              (summary?.agingBreakdown?.OVERDUE_1_7?.totalPaise || 0) +
                (summary?.agingBreakdown?.OVERDUE_8_30?.totalPaise || 0),
            )}
          </div>
          <div className="text-[10px] text-[#6B7280] mt-1">Short-term aging window</div>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            31+ Days Critical Debt
          </div>
          <div className="text-2xl font-bold font-mono text-[#0A192F] mt-2">
            {formatPaiseToInr(
              (summary?.agingBreakdown?.OVERDUE_31_60?.totalPaise || 0) +
                (summary?.agingBreakdown?.OVERDUE_60_PLUS?.totalPaise || 0),
            )}
          </div>
          <div className="text-[10px] text-[#6B7280] mt-1">High-risk recovery accounts</div>
        </div>
      </div>

      {/* Aging Category Filters */}
      <div className="flex flex-wrap gap-2 pt-2">
        {[
          { key: '', label: 'All Dues' },
          { key: 'NOT_DUE', label: 'Not Due (Current)' },
          { key: 'OVERDUE_1_7', label: '1 - 7 Days' },
          { key: 'OVERDUE_8_30', label: '8 - 30 Days' },
          { key: 'OVERDUE_31_60', label: '31 - 60 Days' },
          { key: 'OVERDUE_60_PLUS', label: '60+ Days Critical' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedAging(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border rounded-none transition-colors ${
              selectedAging === tab.key
                ? 'bg-[#0A192F] text-[#FBFBF9] border-[#0A192F]'
                : 'bg-[#FBFBF9] text-[#4B5563] border-[#E5E7EB] hover:bg-[#F5F5F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dues Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : duesData.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0A192F]">No outstanding dues in this category</p>
            <p className="text-xs text-[#6B7280]">All member invoices in this category are fully settled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Member Details</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Aging Status</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right font-bold text-[#B91C1C]">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {duesData.map((inv) => {
                  const badge = getAgingBadge(inv.agingBucket);

                  return (
                    <tr key={inv.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                          className="font-mono font-bold text-[#0A192F] hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#111827]">
                          {inv.member?.firstName} {inv.member?.lastName}
                        </div>
                        <div className="text-[10px] font-mono text-[#6B7280]">
                          {inv.member?.memberCode}  {inv.member?.mobile}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#4B5563]">
                        {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider rounded-none ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4B5563]">
                        {formatPaiseToInr(inv.totalAmountInPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#047857]">
                        {formatPaiseToInr(inv.paidAmountInPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#B91C1C]">
                        {formatPaiseToInr(inv.balanceDueInPaise)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 text-xs bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none"
                            onClick={() => handleOpenCollectModal(inv)}
                          >
                            Collect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-[#E5E7EB] hover:bg-[#E5E7EB] rounded-none text-[#4B5563]"
                            onClick={() => handleOpenExtendModal(inv)}
                          >
                            Extend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Collect Outstanding Due</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Invoice {selectedInvoice.invoiceNumber}  {selectedInvoice.member?.firstName}{' '}
                {selectedInvoice.member?.lastName}
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="p-3 bg-[#F5F5F0] border border-[#E5E7EB] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Total Invoice:</span>
                  <span className="font-mono">{formatPaiseToInr(selectedInvoice.totalAmountInPaise)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#B91C1C]">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">{formatPaiseToInr(selectedInvoice.balanceDueInPaise)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Collection Amount (â‚¹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amountRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethodType })
                  }
                  className="w-full h-10 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                >
                  <option value={PaymentMethodType.UPI}>UPI / QR</option>
                  <option value={PaymentMethodType.CASH}>Cash Drawer</option>
                  <option value={PaymentMethodType.CARD_MANUAL}>Credit / Debit Card</option>
                  <option value={PaymentMethodType.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMethodType.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  UTR / Reference / Card Auth #
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 423984029348 or Cheque 002934"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Notes
                </label>
                <Input
                  type="text"
                  placeholder="Optional notes or receipt remarks"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment & Issue Receipt'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Extend Due Date Modal */}
      {isExtendModalOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Extend Payment Due Date</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Invoice {selectedInvoice.invoiceNumber}  {selectedInvoice.member?.firstName}{' '}
                {selectedInvoice.member?.lastName}
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div className="text-xs text-[#4B5563]">
                Current Due Date:{' '}
                <span className="font-mono font-bold text-[#0A192F]">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  New Due Date *
                </label>
                <Input
                  type="date"
                  required
                  value={extendForm.newDueDate}
                  onChange={(e) => setExtendForm({ ...extendForm, newDueDate: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Audit Reason for Extension *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Member requested 7 days extension due to travel"
                  value={extendForm.reason}
                  onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm Extension & Audit'}
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


