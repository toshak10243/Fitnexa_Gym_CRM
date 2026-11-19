import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { LeadStage, LeadLostReason } from '@fitnexa/shared';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  // Stage Update State
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState<LeadStage>(LeadStage.NEW);
  const [lostReason, setLostReason] = useState<LeadLostReason>(LeadLostReason.TOO_EXPENSIVE);
  const [lostNotes, setLostNotes] = useState('');

  // Schedule Follow-up Modal
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpCallType, setFollowUpCallType] = useState('PHONE_CALL');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);

  // Convert to Member Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertPlanId, setConvertPlanId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const fetchLeadData = async () => {
    setIsLoading(true);
    try {
      const [leadRes, planRes] = await Promise.all([
        apiClient.get(`/leads/${id}`),
        apiClient.get('/membership-plans'),
      ]);
      setLead(leadRes.data.data);
      setSelectedStage(leadRes.data.data.stage);
      setPlans(planRes.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLeadData();
  }, [id]);

  const handleStageChange = async (newStage: LeadStage) => {
    setSelectedStage(newStage);
    if (newStage === LeadStage.LOST) return; // Wait for reason input

    setIsUpdatingStage(true);
    try {
      await apiClient.patch(`/leads/${id}/stage`, {
        stage: newStage,
      });
      fetchLeadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update stage');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStage(true);
    try {
      await apiClient.patch(`/leads/${id}/stage`, {
        stage: LeadStage.LOST,
        lostReason,
        lostNotes: lostNotes.trim() || undefined,
      });
      fetchLeadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record lost stage');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;
    setIsSchedulingFollowUp(true);
    try {
      await apiClient.post(`/leads/${id}/follow-ups`, {
        scheduledAt: new Date(followUpDate).toISOString(),
        callType: followUpCallType,
        notes: followUpNotes.trim() || undefined,
      });
      setIsFollowUpModalOpen(false);
      setFollowUpDate('');
      setFollowUpNotes('');
      fetchLeadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSchedulingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    const outcome = prompt('Enter follow-up outcome (e.g. "Interested in annual package; trial booked"):');
    if (!outcome) return;
    try {
      await apiClient.patch(`/leads/follow-ups/${followUpId}/complete`, {
        outcome,
      });
      fetchLeadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete follow-up');
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertError(null);
    setIsConverting(true);
    try {
      const res = await apiClient.post(`/leads/${id}/convert`, {
        planId: convertPlanId || undefined,
        joiningDate: joiningDate ? new Date(joiningDate).toISOString() : undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      const newMember = res.data.data;
      navigate(`/members/${newMember.id}`);
    } catch (err: any) {
      setConvertError(err?.response?.data?.message || 'Lead conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center space-y-4">
        <div className="text-xs text-[#6B7280]">Lead record not found.</div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none"
          onClick={() => navigate('/leads')}
        >
          ← Back to Leads
        </Button>
      </div>
    );
  }

  const isConverted = lead.stage === 'CONVERTED';
  const isLost = lead.stage === 'LOST';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              {lead.fullName}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                isConverted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isLost
                  ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {lead.stage.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-mono">
            {lead.mobileNumber} {lead.email ? `| ${lead.email}` : ''} | Source: {lead.source}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/leads')}
          >
            ← Leads List
          </Button>
          {!isConverted && (
            <Button
              className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4 font-bold"
              onClick={() => setIsConvertModalOpen(true)}
            >
              ✓ One-Click Convert to Member
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Progression Stage Tracker */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
          Pipeline Progression Stage
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.values(LeadStage).map((s) => (
            <button
              key={s}
              type="button"
              disabled={isConverted || isUpdatingStage}
              onClick={() => handleStageChange(s)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                selectedStage === s
                  ? 'bg-[#0A192F] text-white border-[#0A192F]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {selectedStage === LeadStage.LOST && !isLost && (
          <form onSubmit={handleMarkLost} className="mt-3 p-3 bg-white border border-red-200 space-y-2">
            <span className="text-xs font-bold text-[#B91C1C]">Specify Reason for Drop-off:</span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value as LeadLostReason)}
                className="text-xs border border-[#E5E7EB] p-1.5 bg-[#FBFBF9]"
              >
                {Object.values(LeadLostReason).map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Input
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                placeholder="Reason notes..."
                className="text-xs border-[#E5E7EB] bg-[#FBFBF9] h-8 rounded-none"
              />
            </div>
            <Button
              type="submit"
              className="bg-[#B91C1C] text-white text-xs h-7 px-3 rounded-none font-bold"
            >
              Confirm Lost Stage
            </Button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Fitness Goals */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Inquiry Profile
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase">Goal:</span>
              <span className="font-bold text-[#0A192F]">{lead.fitnessGoal || 'General Fitness'}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase">Inquiry Date:</span>
              <span className="font-mono text-[#0A192F]">
                {new Date(lead.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
            {lead.trialScheduledAt && (
              <div>
                <span className="text-[#6B7280] block text-[10px] uppercase">Scheduled Trial:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {new Date(lead.trialScheduledAt).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">
              Counselor Notes
            </span>
            <p className="text-xs text-[#0A192F] whitespace-pre-wrap">
              {lead.notes || 'No counselor notes recorded.'}
            </p>
          </div>
        </div>

        {/* Right Column: Follow-up Timeline */}
        <div className="md:col-span-2 bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Scheduled Follow-Ups & Interaction History ({lead.followUps?.length || 0})
            </span>
            {!isConverted && (
              <Button
                size="sm"
                className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs h-7 px-3 rounded-none font-bold"
                onClick={() => setIsFollowUpModalOpen(true)}
              >
                + Schedule Follow-Up
              </Button>
            )}
          </div>

          {(lead.followUps || []).length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B7280]">
              No follow-ups logged yet. Click &apos;+ Schedule Follow-Up&apos; to set a reminder.
            </div>
          ) : (
            <div className="space-y-3">
              {(lead.followUps || []).map((fu: any) => {
                const isPending = fu.status === 'PENDING';
                return (
                  <div
                    key={fu.id}
                    className="p-3 bg-white border border-[#E5E7EB] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0A192F]">
                          {new Date(fu.scheduledAt).toLocaleString('en-IN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] font-mono border border-[#E5E7EB] px-1 bg-[#FBFBF9]">
                          {fu.callType || 'CALL'}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border ${
                            isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </div>
                      {fu.notes && <div className="text-[#6B7280] mt-1">{fu.notes}</div>}
                      {fu.outcome && (
                        <div className="text-emerald-700 font-bold mt-1">Outcome: {fu.outcome}</div>
                      )}
                    </div>

                    {isPending && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 border-[#E5E7EB] hover:bg-[#F5F5F0] rounded-none"
                        onClick={() => handleCompleteFollowUp(fu.id)}
                      >
                        Log Outcome
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Follow-up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Schedule Follow-Up Reminder
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsFollowUpModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Reminder Date & Time *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Interaction Channel
                </label>
                <select
                  value={followUpCallType}
                  onChange={(e) => setFollowUpCallType(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="PHONE_CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Follow-up</option>
                  <option value="IN_PERSON">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Follow-up Notes / Talking Points
                </label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={2}
                  placeholder="Check if prospect visited rival gym; offer 5% seasonal discount."
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSchedulingFollowUp}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isSchedulingFollowUp ? 'Scheduling...' : 'Set Reminder'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Member Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Convert Inquiry to Registered Gym Member
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsConvertModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {convertError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {convertError}
              </div>
            )}

            <form onSubmit={handleConvertLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Membership Plan (Optional)
                </label>
                <select
                  value={convertPlanId}
                  onChange={(e) => setConvertPlanId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">No Plan (Register Member Profile Only)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationInMonths} Mos - ₹{(p.finalPriceInPaise / 100).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Joining / Activation Date
                </label>
                <Input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Residential Address
                </label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street / Flat / House No."
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    City
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="text-xs border-[#E5E7EB] bg-white rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Pincode
                  </label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="110001"
                    className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isConverting}
                  className="bg-emerald-700 text-white hover:bg-emerald-800 text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isConverting ? 'Converting...' : 'Execute Conversion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
