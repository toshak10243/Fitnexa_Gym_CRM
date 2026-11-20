import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { RefundStatus, UserRole } from '@fitnexa/shared';
import { formatPaiseToInr, parseInrToPaise } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';

export function RefundsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [refunds, setRefunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Request Refund Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    paymentId: '',
    amountRupees: '',
    reason: '',
  });

  // Process Refund Modal
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({
    payoutReference: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const isOwner = user?.role === UserRole.GYM_OWNER || user?.role === UserRole.SUPER_ADMIN;

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/billing/refunds?page=${page}&limit=15`);
      if (res.data.success) {
        setRefunds(res.data.data.items || []);
        setTotalPages(res.data.data.meta.totalPages || 1);
        setTotalCount(res.data.data.meta.total || 0);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [page]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        paymentId: requestForm.paymentId,
        amountInPaise: parseInrToPaise(requestForm.amountRupees),
        reason: requestForm.reason,
      };

      const res = await apiClient.post('/billing/refunds/request', payload);
      if (res.data.success) {
        setIsRequestModalOpen(false);
        fetchRefunds();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (refundId: string) => {
    if (!window.confirm('Are you sure you want to approve this refund?')) return;
    setIsSubmitting(true);

    try {
      const res = await apiClient.post(`/billing/refunds/${refundId}/approve`);
      if (res.data.success) {
        fetchRefunds();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;

    setIsSubmitting(true);
    setActionError('');

    try {
      const res = await apiClient.post(
        `/billing/refunds/${selectedRefund.id}/process`,
        payoutForm,
      );
      if (res.data.success) {
        setIsProcessModalOpen(false);
        fetchRefunds();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to process refund payout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.PROCESSED:
        return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
      case RefundStatus.APPROVED:
        return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
      case RefundStatus.PENDING_APPROVAL:
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      case RefundStatus.REJECTED:
        return 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';
      default:
        return 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Refunds & Adjustments</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative approval workflow and disbursement ledger for payment reversals and refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#0A192F] text-[#0A192F] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => setIsRequestModalOpen(true)}
          >
            + Request Refund
          </Button>
          <Button
            variant="outline"
            className="border-[#0A192F] text-[#0A192F] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/billing/payments')}
          >
            Payments Ledger
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

      {/* Refunds Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0A192F]">No refunds on record</p>
            <p className="text-xs text-[#6B7280]">
              Requested refunds, approvals, and payout records will be archived here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Refund #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Original Payment</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5F0] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                      {r.refundNumber}
                    </td>
                    <td className="py-3 px-4 text-[#4B5563]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#111827]">
                        {r.member?.firstName} {r.member?.lastName}
                      </div>
                      <div className="text-[10px] font-mono text-[#6B7280]">
                        {r.member?.memberCode}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#4B5563]">
                      {r.payment?.paymentNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-[#4B5563] max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#DC2626]">
                      {formatPaiseToInr(r.amountInPaise)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider rounded-none ${getStatusBadge(
                          r.status,
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#4B5563]">
                      {r.approvedBy?.fullName || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === RefundStatus.PENDING_APPROVAL && isOwner && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleApprove(r.id)}
                            className="h-7 text-xs bg-[#047857] hover:bg-[#065F46] text-[#FBFBF9] rounded-none"
                          >
                            Approve
                          </Button>
                        )}
                        {r.status === RefundStatus.APPROVED && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedRefund(r);
                              setPayoutForm({ payoutReference: '' });
                              setIsProcessModalOpen(true);
                            }}
                            className="h-7 text-xs bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none"
                          >
                            Disburse Payout
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between bg-[#F5F5F0]">
            <span className="text-xs text-[#6B7280]">
              Page <span className="font-semibold text-[#0A192F]">{page}</span> of{' '}
              <span className="font-semibold text-[#0A192F]">{totalPages}</span> (Total {totalCount})
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 rounded-none border-[#E5E7EB] text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-none border-[#E5E7EB] text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Request Refund Modal */}
      {isRequestModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Request Payment Refund</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Submits a formal refund request subject to owner approval.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Payment ID (UUID) *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Paste Payment UUID from Collections Ledger"
                  value={requestForm.paymentId}
                  onChange={(e) => setRequestForm({ ...requestForm, paymentId: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Refund Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000.00"
                  value={requestForm.amountRupees}
                  onChange={(e) => setRequestForm({ ...requestForm, amountRupees: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Audit Reason for Refund *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Medical emergency / Relocation to another city"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Process Payout Modal */}
      {isProcessModalOpen && selectedRefund && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Record Refund Payout</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Refund {selectedRefund.refundNumber} • {formatPaiseToInr(selectedRefund.amountInPaise)}
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleProcessSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Payout Reference / UTR / Voucher # *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. UPI-REF-98327492 or Cash Voucher #104"
                  value={payoutForm.payoutReference}
                  onChange={(e) => setPayoutForm({ payoutReference: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Disbursing...' : 'Confirm Disbursement'}
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
