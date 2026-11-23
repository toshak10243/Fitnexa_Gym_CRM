import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

export function TrainerSchedulePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState('');

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookTrainerId, setBookTrainerId] = useState('');
  const [bookMemberId, setBookMemberId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      let url = '/trainers/schedule';
      if (selectedTrainerFilter) {
        url += `?trainerProfileId=${selectedTrainerFilter}`;
      }
      const results = await Promise.allSettled([
        apiClient.get(url),
        apiClient.get('/trainers'),
        apiClient.get('/members?limit=50'),
      ]);
      const [schedResult, trainResult, memberResult] = results;
      if (trainResult.status !== 'fulfilled') throw trainResult.reason;
      const trainRes = trainResult.value;
      const schedRes = schedResult.status === 'fulfilled' ? schedResult.value : null;
      const memRes = memberResult.status === 'fulfilled' ? memberResult.value : null;
      const rawSched = schedRes?.data?.data || schedRes?.data || [];
      setSessions(Array.isArray(rawSched) ? rawSched : (rawSched?.items || []));
      const rawTrain = trainRes.data?.data || trainRes.data;
      setTrainers(Array.isArray(rawTrain) ? rawTrain : (rawTrain?.items || rawTrain?.data || []));
      const rawMem = memRes?.data?.data || memRes?.data || [];
      setMembers(Array.isArray(rawMem) ? rawMem : (rawMem?.items || []));
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [selectedTrainerFilter]);

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTrainerId || !bookMemberId || !scheduledAt) {
      setBookError('Trainer, member, and date/time are required.');
      return;
    }

    setBookError(null);
    setIsBooking(true);
    try {
      await apiClient.post('/trainers/sessions', {
        branchId: trainers.find((trainer) => trainer.id === bookTrainerId)?.branchId || members.find((member) => member.id === bookMemberId)?.branchId,
        trainerProfileId: bookTrainerId,
        memberId: bookMemberId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        notes: bookingNotes.trim() || undefined,
      });
      setIsBookModalOpen(false);
      setBookTrainerId('');
      setBookMemberId('');
      setScheduledAt('');
      setBookingNotes('');
      fetchSchedule();
    } catch (err: any) {
      setBookError(err?.response?.data?.message || 'Failed to book training session');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    if (!confirm('Mark this personal training session as completed?')) return;
    try {
      await apiClient.patch(`/trainers/sessions/${sessionId}/complete`, {
        notes: 'Session finished successfully.',
      });
      fetchSchedule();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete session');
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason === null) return;
    try {
      await apiClient.patch(`/trainers/sessions/${sessionId}/cancel`, {
        reason: reason || 'Cancelled by staff',
      });
      fetchSchedule();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel session');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Personal Training Schedule & Bookings
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Workout slots, automated overlap conflict prevention, session completion, and attendance validation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/trainers')}
          >
            ← Trainers Roster
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsBookModalOpen(true)}
          >
            + Book Training Session
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#0A192F] uppercase">Filter by Coach:</span>
          <select
            value={selectedTrainerFilter}
            onChange={(e) => setSelectedTrainerFilter(e.target.value)}
            className="text-xs border border-[#E5E7EB] bg-white px-3 py-1.5 rounded-none font-medium text-[#0A192F] h-8"
          >
            <option value="">All Coaches</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user?.fullName || t.user?.name || 'Trainer'}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs font-mono text-[#6B7280]">
          Total Slots: <span className="font-bold text-[#0A192F]">{sessions.length}</span>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Coach</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                    No sessions scheduled for this period. Click &apos;+ Book Training Session&apos; to schedule.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const isScheduled = sess.status === 'SCHEDULED';
                  const isCompleted = sess.status === 'COMPLETED';
                  const isCancelled = sess.status === 'CANCELLED';

                  return (
                    <tr key={sess.id} className="hover:bg-white transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] font-medium text-[#0A192F]">
                        {new Date(sess.scheduledAt).toLocaleString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {sess.trainerProfile?.user?.name || 'Assigned Coach'}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0A192F]">
                        <div>{sess.member?.fullName}</div>
                        <div className="text-[10px] text-[#6B7280] font-mono">
                          {sess.member?.mobileNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-[#0A192F]">
                        {sess.durationMinutes} min
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isCancelled
                              ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                        {sess.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isScheduled && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-700 text-white hover:bg-emerald-800 text-[10px] h-6 px-2 rounded-none font-bold"
                              onClick={() => handleCompleteSession(sess.id)}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-[#B91C1C] hover:bg-red-50 text-[10px] h-6 px-2 rounded-none"
                              onClick={() => handleCancelSession(sess.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Session Modal */}
      {isBookModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Book Training Session
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
                onClick={() => setIsBookModalOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {bookError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {bookError}
              </div>
            )}

            <form onSubmit={handleBookSession} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Coach *
                </label>
                <select
                  required
                  value={bookTrainerId}
                  onChange={(e) => setBookTrainerId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Coach...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.fullName || t.user?.name || 'Trainer'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Member *
                </label>
                <select
                  required
                  value={bookMemberId}
                  onChange={(e) => setBookMemberId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Date & Time *
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Duration (Minutes)
                  </label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Focus / Notes
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Leg day focus; hypertrophy and squat mechanics."
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isBooking}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isBooking ? 'Validating Conflicts...' : 'Confirm Booking'}
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


