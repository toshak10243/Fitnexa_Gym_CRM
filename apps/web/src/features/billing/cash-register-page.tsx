import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr, parseInrToPaise } from '../../lib/utils';

export function CashRegisterPage() {
  const navigate = useNavigate();

  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);

  // Open Drawer Modal State
  const [isOpenModalVisible, setIsOpenModalVisible] = useState(false);
  const [openForm, setOpenForm] = useState({
    branchId: '',
    openingFloatRupees: '1000.00',
    notes: '',
  });

  // Close Drawer Modal State
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);
  const [closeForm, setCloseForm] = useState({
    actualCashRupees: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchRegisterData = async () => {
    setIsLoading(true);
    try {
      const [currentRes, branchesRes] = await Promise.all([
        apiClient.get('/billing/cash-register/current'),
        apiClient.get('/tenant/branches'),
      ]);

      const currentPayload = currentRes.data?.data || currentRes.data;
      setActiveSession(currentPayload?.id ? currentPayload : null);

      const branchesPayload = branchesRes.data?.data || branchesRes.data;
      const bList = Array.isArray(branchesPayload) ? branchesPayload : branchesPayload?.items || [];
      setBranches(bList);
      if (bList.length > 0 && !openForm.branchId) {
        setOpenForm((prev) => ({ ...prev, branchId: bList[0].id }));
      }
    } catch {
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisterData();
  }, []);

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        branchId: openForm.branchId,
        openingFloatInPaise: parseInrToPaise(openForm.openingFloatRupees),
        notes: openForm.notes || undefined,
      };

      const res = await apiClient.post('/billing/cash-register/open', payload);
      if (res.data.success) {
        setIsOpenModalVisible(false);
        fetchRegisterData();
      }
    } catch (err: any) {
      const status = err.response?.status;
      setActionError(
        status === 409
          ? 'A cash register shift is already open for this branch. Close the active shift before opening a new one.'
          : err.response?.data?.message || 'Failed to open register session',
      );
      if (status === 409) fetchRegisterData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        actualClosingInPaise: parseInrToPaise(closeForm.actualCashRupees),
        notes: closeForm.notes || undefined,
      };

      const res = await apiClient.post(
        `/billing/cash-register/${activeSession.id}/close`,
        payload,
      );
      if (res.data.success) {
        setIsCloseModalVisible(false);
        fetchRegisterData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to close register session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expectedPaise = activeSession?.expectedClosingPaise || 0;
  const countedPaise = parseInrToPaise(closeForm.actualCashRupees || 0);
  const liveVariancePaise = countedPaise - expectedPaise;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Cash Register & Drawer</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Physical cash float control, shift drawer reconciliation, and cash audit tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : activeSession ? (
        /* Active Open Shift Drawer */
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#047857]">
                  Shift Drawer Active & Open
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0A192F] mt-1">
                Branch: {activeSession.branch?.name || 'Main Branch'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                Opened by {activeSession.openedBy?.fullName} on{' '}
                {new Date(activeSession.openedAt).toLocaleString('en-IN')}
              </p>
            </div>

            <Button
              onClick={() => {
                setCloseForm({
                  actualCashRupees: (activeSession.expectedClosingPaise / 100).toFixed(2),
                  notes: '',
                });
                setIsCloseModalVisible(true);
              }}
              className="bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] rounded-none text-xs"
            >
              Reconcile & Close Drawer
            </Button>
          </div>

          {/* Active Counters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Opening Cash Float
              </div>
              <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">
                {formatPaiseToInr(activeSession.openingFloatInPaise)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Physical start balance</div>
            </div>

            <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Cash Collections
              </div>
              <div className="text-xl font-bold font-mono text-[#047857] mt-1">
                +{formatPaiseToInr(activeSession.cashCollectedInPaise)}
              </div>
              <div className="text-[10px] text-[#047857] mt-0.5 font-medium">From cash receipts</div>
            </div>

            <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Cash Refunds / Payouts
              </div>
              <div className="text-xl font-bold font-mono text-[#DC2626] mt-1">
                -{formatPaiseToInr(activeSession.cashRefundedInPaise)}
              </div>
              <div className="text-[10px] text-[#DC2626] mt-0.5 font-medium">Drawer disbursements</div>
            </div>

            <div className="bg-[#0A192F] text-[#FBFBF9] border border-[#0A192F] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Expected In Drawer
              </div>
              <div className="text-xl font-bold font-mono text-[#FBFBF9] mt-1">
                {formatPaiseToInr(activeSession.expectedClosingPaise)}
              </div>
              <div className="text-[10px] text-[#9CA3AF] mt-0.5">Target count upon close</div>
            </div>
          </div>
        </div>
      ) : (
        /* No Open Shift Drawer Card */
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-[#F5F5F0] border border-[#E5E7EB] text-[#0A192F]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="1" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0A192F]">No Cash Drawer Shift Currently Open</h2>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1">
              Start a new shift session by counting physical cash float in the register drawer before
              accepting cash payments.
            </p>
          </div>
          <Button
            onClick={() => setIsOpenModalVisible(true)}
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
          >
            Open New Shift Drawer
          </Button>
        </div>
      )}

      {/* Open Drawer Modal */}
      {isOpenModalVisible && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Open Cash Register Shift</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Record opening physical cash float before taking payments.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleOpenDrawer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Gym Branch *
                </label>
                <select
                  required
                  value={openForm.branchId}
                  onChange={(e) => setOpenForm({ ...openForm, branchId: e.target.value })}
                  className="w-full h-10 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || 'Primary'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Opening Float (â‚¹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={openForm.openingFloatRupees}
                  onChange={(e) => setOpenForm({ ...openForm, openingFloatRupees: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-sm"
                />
                <span className="text-[10px] text-[#6B7280]">
                  Initial physical cash placed in drawer for change.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Shift Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Morning Shift - Cashier John"
                  value={openForm.notes}
                  onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpenModalVisible(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Opening...' : 'Confirm & Open Shift'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Close Drawer Reconciliation Modal */}
      {isCloseModalVisible && activeSession && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Close & Reconcile Cash Shift</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Count physical cash currently in the drawer and record variance.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCloseDrawer} className="space-y-4">
              <div className="p-3 bg-[#F5F5F0] border border-[#E5E7EB] text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Expected Cash in Drawer:</span>
                  <span className="font-bold text-[#0A192F]">{formatPaiseToInr(expectedPaise)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Actual Physical Cash Count (â‚¹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={closeForm.actualCashRupees}
                  onChange={(e) => setCloseForm({ ...closeForm, actualCashRupees: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-sm"
                />
              </div>

              {/* Variance Indicator */}
              <div
                className={`p-3 border text-xs font-semibold flex justify-between items-center ${
                  liveVariancePaise === 0
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                    : liveVariancePaise > 0
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                }`}
              >
                <span>
                  {liveVariancePaise === 0
                    ? 'Drawer Perfectly Balanced'
                    : liveVariancePaise > 0
                    ? 'Cash Surplus (Over)'
                    : 'Cash Shortage (Deficit)'}
                </span>
                <span className="font-mono text-sm">
                  {liveVariancePaise > 0 ? '+' : ''}
                  {formatPaiseToInr(liveVariancePaise)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Reconciliation Notes / Reason for Variance
                </label>
                <Input
                  type="text"
                  placeholder="Optional shift handover remarks"
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCloseModalVisible(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] rounded-none text-xs"
                >
                  {isSubmitting ? 'Reconciling...' : 'Confirm & Close Drawer'}
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


