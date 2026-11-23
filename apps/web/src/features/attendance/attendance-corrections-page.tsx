import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

interface CorrectionItem {
  id: string;
  memberId: string;
  correctionType: string;
  originalTimestamp?: string;
  correctedTimestamp: string;
  reason: string;
  status: string;
  reviewNotes?: string;
  createdAt: string;
  member: {
    id: string;
    memberCode: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  requestedByUser?: {
    id: string;
    fullName: string;
  };
  reviewedByUser?: {
    id: string;
    fullName: string;
  };
}

export function AttendanceCorrectionsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Form state for new correction
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMemberCode, setNewMemberCode] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; memberCode: string; fullName?: string; firstName?: string; lastName?: string }>>([]);
  const [newType, setNewType] = useState('INSERT_CHECKOUT');
  const [newTimestamp, setNewTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review state
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchCorrections = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/attendance/corrections');
      const raw = res.data?.data || res.data;
      setItems(raw?.items || (Array.isArray(raw) ? raw : []));
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
    apiClient.get('/members?limit=100').then((res) => {
      const raw = res.data?.data || res.data;
      setMembers(raw?.items || (Array.isArray(raw) ? raw : []));
    }).catch(() => setMembers([]));
  }, []);

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberCode.trim() || !newReason.trim()) {
      setFeedback({ type: 'error', message: 'Member code and justification reason are required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Find member by code
      const found = members.find((member) => member.memberCode === newMemberCode);
      if (!found) {
        throw new Error(`Member with code '${newMemberCode}' not found.`);
      }

      await apiClient.post('/attendance/corrections', {
        correctionType: newType,
        correctedValue: {
          checkOutTime: new Date(newTimestamp).toISOString(),
          memberId: found.id,
        },
        reason: newReason.trim(),
      });

      setFeedback({ type: 'success', message: 'Correction request submitted for manager review.' });
      setShowCreateModal(false);
      setNewMemberCode('');
      setNewReason('');
      await fetchCorrections();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Submission failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedCorrection) return;
    setIsReviewing(true);
    setFeedback(null);

    try {
      await apiClient.post(`/attendance/corrections/${selectedCorrection.id}/${approved ? 'approve' : 'reject'}`);

      setFeedback({
        type: 'success',
        message: `Correction request ${approved ? 'APPROVED' : 'REJECTED'} successfully.`,
      });
      setSelectedCorrection(null);
      setReviewNotes('');
      await fetchCorrections();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Review failed.' });
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Attendance Corrections & Dispute Workflow
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Two-step audit approval workflow for missed biometric taps, time adjustments, and ledger disputes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/attendance')}
          >
            ← Back to Telemetry
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none"
            onClick={() => setShowCreateModal(true)}
          >
            + Request Correction
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Corrections Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Requested At</th>
                  <th className="py-2.5 px-4 font-semibold">Member</th>
                  <th className="py-2.5 px-4 font-semibold">Correction Type</th>
                  <th className="py-2.5 px-4 font-semibold">Adjusted Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Justification Reason</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                      No attendance correction requests recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => {
                    const isPending = c.status === 'PENDING' || c.status === 'PENDING_APPROVAL';
                    return (
                      <tr key={c.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(c.createdAt).toLocaleDateString('en-IN')}{' '}
                          {new Date(c.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0A192F]">
                          {c.member?.fullName || `${c.member?.firstName || ''} ${c.member?.lastName || ''}`.trim() || c.member?.memberCode || 'Unknown Member'}
                          <span className="block font-mono text-[11px] text-[#6B7280]">
                            {c.member?.memberCode || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {c.correctionType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(c.correctedTimestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                          {c.reason}
                          {c.reviewNotes && (
                            <span className="block text-[10px] text-[#0A192F] font-semibold mt-0.5">
                              Note: {c.reviewNotes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              c.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : c.status === 'REJECTED'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" className="text-xs rounded-none h-7 px-3" onClick={() => { setSelectedCorrection(c); setReviewNotes(''); }}>Edit / Review</Button>
                              <Button variant="outline" size="sm" className="text-xs rounded-none h-7 px-3 text-red-700" onClick={async () => {
                                if (!window.confirm('Delete this correction request?')) return;
                                try {
                                  await apiClient.delete(`/attendance/corrections/${c.id}`);
                                  setItems((current) => current.filter((item) => item.id !== c.id));
                                  setFeedback({ type: 'success', message: 'Correction request deleted successfully.' });
                                } catch (err: any) {
                                  setFeedback({ type: 'error', message: err?.response?.data?.message || err?.message || 'Delete failed.' });
                                }
                              }}>Delete</Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#6B7280]">
                              Reviewed by {c.reviewedByUser?.fullName || 'Manager'}
                            </span>
                          )}
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

      {/* Request Correction Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
                Request Attendance Correction
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Member
                </label>
                <select
                  required
                  value={newMemberCode}
                  onChange={(e) => setNewMemberCode(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
                >
                  <option value="">Choose member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.memberCode}>
                      {member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.memberCode} ({member.memberCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Correction Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
                >
                  <option value="INSERT_CHECKOUT">MISSED CHECK OUT</option>
                  <option value="MODIFY_TIMESTAMP">MODIFY TIMESTAMP</option>
                  <option value="VOID_SESSION">VOID SESSION</option>
                  <option value="MANUAL_SESSION_CREATE">MANUAL SESSION CREATE</option>
                  <option value="TIME_ADJUSTMENT">TIME ADJUSTMENT</option>
                  <option value="MANUAL_OVERRIDE">MANUAL OVERRIDE</option>
                  <option value="DISPUTE_RESOLUTION">DISPUTE RESOLUTION</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Accurate Time Stamp
                </label>
                <Input
                  required
                  type="datetime-local"
                  value={newTimestamp}
                  onChange={(e) => setNewTimestamp(e.target.value)}
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Justification Reason
                </label>
                <Input
                  required
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Turnstile gate was in maintenance during power cut"
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs border-[#E5E7EB] rounded-none"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-4"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Review Modal */}
      {selectedCorrection && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
                Manager Review Decision
              </h2>
              <button
                type="button"
                onClick={() => setSelectedCorrection(null)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#6B7280]">Member:</span>{' '}
                <strong className="text-[#0A192F]">
                  {selectedCorrection.member?.fullName || `${selectedCorrection.member?.firstName || ''} ${selectedCorrection.member?.lastName || ''}`.trim() || selectedCorrection.member?.memberCode || 'Unknown Member'} (
                    {selectedCorrection.member?.memberCode || 'N/A'})
                </strong>
              </div>
              <div>
                <span className="text-[#6B7280]">Type:</span>{' '}
                <strong className="font-mono text-[#0A192F]">
                  {selectedCorrection.correctionType}
                </strong>
              </div>
              <div>
                <span className="text-[#6B7280]">Reason:</span>{' '}
                <span className="text-[#0A192F]">{selectedCorrection.reason}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Adjusted Time:</span>{' '}
                <strong className="font-mono text-[#0A192F]">
                  {new Date(selectedCorrection.correctedTimestamp).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Manager Review Notes
              </label>
              <Input
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional decision comments..."
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                disabled={isReviewing}
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs rounded-none"
                onClick={() => handleReview(false)}
              >
                Reject Request
              </Button>
              <Button
                disabled={isReviewing}
                className="bg-emerald-700 text-white hover:bg-emerald-800 text-xs rounded-none px-4"
                onClick={() => handleReview(true)}
              >
                Approve & Reconcile
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


