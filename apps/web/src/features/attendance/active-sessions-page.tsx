import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

interface ActiveSessionItem {
  id: string;
  memberId: string;
  checkInTime: string;
  branchId?: string;
  member: {
    id: string;
    memberCode: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phone: string;
    emergencyContact?: string;
    emergencyContacts?: Array<{
      name: string;
      relationship: string;
      phone: string;
    }>;
  };
}

export function ActiveSessionsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [filterText, setFilterText] = useState('');
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchActiveSessions = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/attendance/active');
      const payload = res.data?.data || res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items || []);
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000); // 30 sec auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleCheckout = async (memberId: string, memberName: string) => {
    setCheckingOutId(memberId);
    setFeedback(null);
    try {
      await apiClient.post('/attendance/check-out', {
        memberId,
        branchId: sessions.find((session) => session.memberId === memberId)?.branchId,
        source: 'MANUAL_FRONT_DESK',
      });
      setFeedback(`Successfully checked out ${memberName}.`);
      await fetchActiveSessions();
    } catch (err: any) {
      setFeedback(err.message || 'Checkout failed.');
    } finally {
      setCheckingOutId(null);
    }
  };

  const getDurationString = (checkInTime: string) => {
    const diffMs = Date.now() - new Date(checkInTime).getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const sessionList = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = sessionList.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    const name = (s.member?.fullName || `${s.member?.firstName || ''} ${s.member?.lastName || ''}`).toLowerCase();
    return (
      name.includes(q) ||
      (s.member?.memberCode && s.member.memberCode.toLowerCase().includes(q)) ||
      (s.member?.phone && s.member.phone.includes(q))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Active Facility Roster
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              {sessions.length} Inside Gym
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time floor occupancy roster. Auto-refreshes every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={fetchActiveSessions}
          >
            Refresh List
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none"
            onClick={() => navigate('/attendance/check-in')}
          >
            + Check-in Athlete
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-full max-w-sm">
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter active members by name, code or phone..."
            className="text-xs rounded-none border-[#E5E7EB] bg-white h-9"
          />
        </div>
        <span className="text-xs text-[#6B7280]">
          Showing {filteredSessions.length} of {sessions.length} athletes
        </span>
      </div>

      {/* Roster Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Member</th>
                  <th className="py-2.5 px-4 font-semibold">Code</th>
                  <th className="py-2.5 px-4 font-semibold">Mobile</th>
                  <th className="py-2.5 px-4 font-semibold">Check-in Time</th>
                  <th className="py-2.5 px-4 font-semibold">Duration</th>
                  <th className="py-2.5 px-4 font-semibold">Emergency Contact</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#6B7280]">
                      No active sessions on the floor right now.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => {
                    const memberName =
                      s.member?.fullName ||
                      `${s.member?.firstName || ''} ${s.member?.lastName || ''}`.trim() ||
                      'Unknown Member';
                    const rawEmContact =
                      s.member?.emergencyContact ||
                      s.member?.emergencyContacts?.[0]?.phone ||
                      null;
                    const emContact = typeof rawEmContact === 'string'
                      ? rawEmContact
                      : rawEmContact && typeof rawEmContact === 'object'
                        ? (rawEmContact as any).phone || (rawEmContact as any).name || 'Registered'
                        : null;
                    return (
                      <tr key={s.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0A192F]">
                          <button
                            type="button"
                            className="hover:underline text-left"
                            onClick={() => navigate(`/members/${s.member?.id || s.memberId}`)}
                          >
                            {memberName}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B7280]">
                          {s.member?.memberCode || ''}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">{s.member?.phone || ''}</td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(s.checkInTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">
                          {getDurationString(s.checkInTime)}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">
                          {emContact ? (
                            <span>{emContact}</span>
                          ) : (
                            <span className="text-[#9CA3AF]">Not registered</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={checkingOutId === s.memberId}
                            className="text-xs border-[#E5E7EB] hover:bg-red-50 hover:text-red-700 rounded-none h-7 px-3"
                            onClick={() => handleCheckout(s.memberId, memberName)}
                          >
                            {checkingOutId === s.memberId ? 'Checking Out...' : 'Check Out'}
                          </Button>
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
    </div>
  );
}


