import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatPaiseToInr } from '../../lib/utils';

interface MemberSearchResult {
  id: string;
  memberCode: string;
  branchId?: string;
  branch?: { id: string };
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  phone: string;
  email?: string;
  status: string;
  profilePhotoUrl?: string;
  memberships?: Array<{
    id: string;
    branchId?: string;
    status: string;
    startDate: string;
    endDate: string;
    plan: {
      id: string;
      name: string;
    };
  }>;
}

const memberDisplayName = (member: MemberSearchResult) =>
  member.fullName || member.name || ([member.firstName, member.lastName].filter(Boolean).join(' ') !== member.memberCode
    ? [member.firstName, member.lastName].filter(Boolean).join(' ')
    : '') || member.memberCode || 'Unnamed Member';

export function CheckInPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  // Search members
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 1) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchParam = trimmedQuery
          ? `&search=${encodeURIComponent(trimmedQuery)}`
          : '';
        const res = await apiClient.get(`/members?limit=25${searchParam}`);
        const payload = res.data?.data || res.data;
        const members = payload?.items || (Array.isArray(payload) ? payload : []);
        setSearchResults(members.map((member: MemberSearchResult) => {
          const sourceName = member.fullName || member.name;
          if ((!member.firstName || !member.lastName || member.firstName === member.memberCode) && sourceName) {
            const [firstName, ...rest] = sourceName.trim().split(/\s+/);
            return { ...member, firstName: member.firstName || firstName, lastName: member.lastName || rest.join(' ') };
          }
          const activeMembership = member.memberships?.find((membership) => membership.status === 'ACTIVE');
          return {
            ...member,
            branchId: member.branchId || activeMembership?.branchId || member.branch?.id,
          };
        }));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // When a member is selected, fetch their access eligibility and active session
  const selectMember = async (member: MemberSearchResult) => {
    setSelectedMember(member);
    setFeedback(null);
    setShowOverrideInput(false);
    setOverrideReason('');

    try {
      // Access policy is evaluated atomically by the check-in endpoint.
      // Keep the workspace ready while we load the member's current session.
      setEvaluation({
        decision: 'PENDING',
        reasonCode: 'READY_FOR_CHECK_IN',
        reasonDetails: 'Final access policy checks run when check-in is confirmed.',
        outstandingDuesPaise: 0,
      });

      // Check if member has active session right now
      const activeRes = await apiClient.get('/attendance/active');
      const rawActive = activeRes.data?.data || activeRes.data;
      const activeList = Array.isArray(rawActive) ? rawActive : (rawActive?.items || []);
      const foundSession = activeList.find((s: any) => s.memberId === member.id);
      setActiveSession(foundSession || null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not verify member access' });
    }
  };

  const handleCheckIn = async (override = false) => {
    if (!selectedMember) return;
    setIsCheckingIn(true);
    setFeedback(null);

    try {
      const payload: any = {
        memberId: selectedMember.id,
        branchId: selectedMember.branchId,
        source: 'MANUAL_FRONT_DESK',
      };

      if (!selectedMember.branchId) {
        setFeedback({ type: 'error', message: 'This member is not linked to a gym branch.' });
        setIsCheckingIn(false);
        return;
      }

      if (override) {
        if (!overrideReason.trim()) {
          setFeedback({ type: 'error', message: 'Staff override reason is required.' });
          setIsCheckingIn(false);
          return;
        }
        payload.override = true;
        payload.overrideReason = overrideReason.trim();
      }

      await apiClient.post('/attendance/check-in', payload);
      setFeedback({
        type: 'success',
        message: `Member ${memberDisplayName(selectedMember)} successfully CHECKED IN.`,
      });
      // Refresh active session status
      await selectMember(selectedMember);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Check-in failed. Please verify member policy.';
      setEvaluation((current: any) => ({
        ...(current || {}),
        decision: 'DENIED',
        reasonCode: 'ACCESS_DENIED',
        reasonDetails: Array.isArray(message) ? message.join(', ') : message,
      }));
      setFeedback({
        type: 'error',
        message: Array.isArray(message) ? message.join(', ') : message,
      });
      if (evaluation?.canOverride) {
        setShowOverrideInput(true);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedMember) return;
    setIsCheckingIn(true);
    setFeedback(null);

    try {
      await apiClient.post('/attendance/check-out', {
        memberId: selectedMember.id,
        branchId: selectedMember.branchId,
        source: 'MANUAL_FRONT_DESK',
      });
      setFeedback({
        type: 'success',
        message: `Member ${memberDisplayName(selectedMember)} successfully CHECKED OUT.`,
      });
      setActiveSession(null);
      // Refresh status
      await selectMember(selectedMember);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Checkout failed.',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Front-Desk Fast Check-in Console
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time biometric & manual admission gate for receptionists and floor managers.
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
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/attendance/active')}
          >
            Active Sessions
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0A192F] mb-2">
          Find Member (Name, Member Code, Mobile)
        </label>
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type at least 2 characters e.g. 'Rahul', 'MEM-001', '9876543210'..."
            className="w-full text-sm rounded-none border-[#E5E7EB] bg-white h-11 focus-visible:ring-1 focus-visible:ring-[#0A192F]"
            autoFocus
          />
          {isSearching && (
            <span className="absolute right-3 top-3 text-xs text-[#6B7280]">Searching...</span>
          )}
        </div>

        {/* Member List / Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 border border-[#E5E7EB] bg-white divide-y divide-[#E5E7EB]">
            <div className="px-3 py-2 bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              {query.trim() ? 'Search Results' : 'All Members'} ({searchResults.length})
            </div>
            {searchResults.map((m) => {
              const activePlan = m.memberships?.find((x) => x.status === 'ACTIVE');
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    selectMember(m);
                    setSearchResults([]);
                    setQuery('');
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#F5F5F0] cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {m.profilePhotoUrl ? (
                      <img src={m.profilePhotoUrl} alt={memberDisplayName(m)} className="w-9 h-9 object-cover" />
                    ) : (
                      <div className="w-9 h-9 bg-[#0A192F] text-white flex items-center justify-center font-bold text-xs">
                        {(m.firstName?.charAt(0) || m.lastName?.charAt(0) || '?').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-[#0A192F]">
                        {memberDisplayName(m)}
                        <span className="ml-2 font-mono text-[11px] text-[#6B7280]">
                          ({m.memberCode})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Phone: {m.phone} | Plan: {activePlan ? activePlan.plan.name : 'No Active Plan'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#0A192F]">Select →</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Selected Member Admission Workspace */}
      {selectedMember && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Athlete Profile Card */}
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
            <div className="flex items-center space-x-4 border-b border-[#E5E7EB] pb-4">
              {selectedMember.profilePhotoUrl ? (
                <img src={selectedMember.profilePhotoUrl} alt={memberDisplayName(selectedMember)} className="w-14 h-14 object-cover" />
              ) : (
                <div className="w-14 h-14 bg-[#0A192F] text-white flex items-center justify-center font-extrabold text-lg">
                  {(selectedMember.firstName?.charAt(0) || selectedMember.lastName?.charAt(0) || '?').toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-bold text-base text-[#0A192F]">
                  {memberDisplayName(selectedMember)}
                </h2>
                <div className="text-xs font-mono text-[#6B7280]">
                  Code: {selectedMember.memberCode}
                </div>
                <div className="text-xs text-[#6B7280]">Phone: {selectedMember.phone}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280]">Account Status:</span>
                <span
                  className={`font-bold ${
                    selectedMember.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {selectedMember.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280]">Current Gym State:</span>
                <span
                  className={`font-bold ${
                    activeSession ? 'text-emerald-700' : 'text-[#6B7280]'
                  }`}
                >
                  {activeSession ? 'INSIDE GYM' : 'CHECKED OUT'}
                </span>
              </div>
              {activeSession && (
                <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                  <span className="text-[#6B7280]">Checked in at:</span>
                  <span className="font-mono text-[#0A192F]">
                    {new Date(activeSession.checkInTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                onClick={() => navigate(`/members/${selectedMember.id}`)}
              >
                View Full Member 360 Profile →
              </Button>
            </div>
          </div>

          {/* Access Evaluation & Dues Engine */}
          <div className="md:col-span-2 bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-5">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                Automated Access Policy & Financial Engine
              </h3>
              {evaluation && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                    evaluation.decision === 'GRANTED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : evaluation.decision === 'DENIED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {evaluation.decision === 'GRANTED'
                    ? 'ACCESS GRANTED'
                    : evaluation.decision === 'DENIED'
                      ? 'ACCESS DENIED'
                      : 'READY TO VALIDATE'}
                </span>
              )}
            </div>

            {evaluation ? (
              <div className="space-y-4">
                {/* Details Breakdown */}
                <div className="bg-white border border-[#E5E7EB] p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Evaluation Reason:</span>
                    <span className="font-bold text-[#0A192F]">
                      {evaluation.reasonCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6B7280]">{evaluation.reasonDetails}</div>

                  <div className="pt-2 border-t border-[#E5E7EB] flex justify-between items-center">
                    <span className="text-[#6B7280]">Outstanding Dues Balance:</span>
                    <span
                      className={`font-mono font-bold ${
                        evaluation.outstandingDuesPaise > 0 ? 'text-[#B91C1C]' : 'text-emerald-700'
                      }`}
                    >
                      {formatPaiseToInr(evaluation.outstandingDuesPaise)}
                    </span>
                  </div>
                </div>

                {/* Dues Warning / Non-blocking Notice */}
                {evaluation.outstandingDuesPaise > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <div className="font-bold uppercase tracking-wider text-[10px]">
                      Outstanding Dues Notice
                    </div>
                    <div>
                      Member has pending dues of {formatPaiseToInr(evaluation.outstandingDuesPaise)}.
                      Entry is permitted per gym policy, but please remind athlete to clear balance at front desk.
                    </div>
                  </div>
                )}

                {/* Override Section if Access Denied */}
                {evaluation.decision === 'DENIED' && (
                  <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                    <div className="text-xs font-bold text-red-800">
                      Access Denied: {evaluation.reasonDetails}
                    </div>

                    {showOverrideInput ? (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-red-900 uppercase">
                          Manager Override Reason (Mandatory Audit Requirement):
                        </label>
                        <Input
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Guest pass approved by Owner / Trial extension"
                          className="text-xs border-red-300 bg-white rounded-none h-9"
                        />
                        <Button
                          disabled={isCheckingIn}
                          className="bg-[#B91C1C] text-white hover:bg-[#991B1B] text-xs rounded-none px-4"
                          onClick={() => handleCheckIn(true)}
                        >
                          Execute Authorized Staff Override Check-In
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="text-xs border-red-300 text-red-700 bg-white hover:bg-red-50 rounded-none"
                        onClick={() => setShowOverrideInput(true)}
                      >
                        Request Manager Override Entry
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {!activeSession ? (
                    <Button
                      disabled={isCheckingIn || evaluation.decision === 'DENIED'}
                      className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs font-bold rounded-none px-6 py-2 h-10"
                      onClick={() => handleCheckIn(false)}
                    >
                      {isCheckingIn ? 'Processing...' : 'CONFIRM CHECK-IN'}
                    </Button>
                  ) : (
                    <Button
                      disabled={isCheckingIn}
                      className="bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded-none px-6 py-2 h-10"
                      onClick={handleCheckOut}
                    >
                      {isCheckingIn ? 'Processing...' : 'CONFIRM CHECK-OUT'}
                    </Button>
                  )}

                  {activeSession && (
                    <Button
                      variant="outline"
                      className="border-[#E5E7EB] text-xs rounded-none hover:bg-[#F5F5F0]"
                      onClick={() => navigate('/attendance/active')}
                    >
                      View Active Floor Roster
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#6B7280]">
                Loading access evaluation engine...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


