import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

interface StaffAttendanceItem {
  id: string;
  staffId: string;
  clockInTime: string;
  clockOutTime?: string;
  notes?: string;
  staff: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export function StaffAttendancePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState<StaffAttendanceItem[]>([]);
  const [isClocking, setIsClocking] = useState(false);
  const [notes, setNotes] = useState('');
  const [staffId, setStaffId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; fullName?: string; email?: string }>>([]);
  const [branchOptions, setBranchOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStaffAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/staff-attendance');
      const raw = res.data?.data || res.data;
      setShifts(raw?.items || (Array.isArray(raw) ? raw : []));
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAttendance();
    Promise.allSettled([apiClient.get('/staff?limit=100'), apiClient.get('/tenant/branches')]).then(([staffRes, branchRes]) => {
      if (staffRes.status === 'fulfilled') { const raw = staffRes.value.data?.data || staffRes.value.data; setStaffOptions(raw?.items || raw || []); }
      if (branchRes.status === 'fulfilled') { const raw = branchRes.value.data?.data || branchRes.value.data; setBranchOptions(raw?.items || raw || []); }
    });
  }, []);

  const handleClockIn = async () => {
    if (!staffId || !branchId) { setFeedback({ type: 'error', message: 'Select staff member and branch first.' }); return; }
    setIsClocking(true);
    setFeedback(null);
    try {
      await apiClient.post('/staff-attendance/check-in', {
        staffId, branchId,
        notes: notes.trim() || undefined,
      });
      setFeedback({ type: 'success', message: 'Staff successfully clocked in for shift duty.' });
      setNotes('');
      await fetchStaffAttendance();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Clock-in failed.' });
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffId || !branchId) { setFeedback({ type: 'error', message: 'Select staff member and branch first.' }); return; }
    setIsClocking(true);
    setFeedback(null);
    try {
      await apiClient.post('/staff-attendance/check-out', {
        staffId, branchId,
        notes: notes.trim() || undefined,
      });
      setFeedback({ type: 'success', message: 'Staff successfully clocked out of shift duty.' });
      setNotes('');
      await fetchStaffAttendance();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Clock-out failed.' });
    } finally {
      setIsClocking(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Staff Shift Attendance & Duty Register
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Track daily duty shifts, clock-in times, and trainer floor hours.
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

      {/* Clock In / Out Action Box */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">
          Shift Duty Action
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-9 border border-[#E5E7EB] bg-white px-3 text-xs">
            <option value="">Select staff member</option>
            {staffOptions.map((staff) => <option key={staff.id} value={staff.id}>{staff.fullName || staff.email}</option>)}
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 border border-[#E5E7EB] bg-white px-3 text-xs">
            <option value="">Select branch</option>
            {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional shift notes (e.g. Morning Floor Duty, PT Shift)..."
            className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs flex-1"
          />
          <div className="flex items-center gap-2">
            <Button
              disabled={isClocking}
              className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-5 h-9 min-w-[110px] whitespace-nowrap"
              onClick={handleClockIn}
            >
              Clock In Duty
            </Button>
            <Button
              disabled={isClocking}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 text-xs rounded-none px-5 h-9 min-w-[110px] whitespace-nowrap"
              onClick={handleClockOut}
            >
              Clock Out Duty
            </Button>
          </div>
        </div>
      </div>

      {/* Shift Register Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Recent Staff Duty Register
          </h3>
        </div>

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
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">Role</th>
                  <th className="py-2.5 px-4 font-semibold">Clock In</th>
                  <th className="py-2.5 px-4 font-semibold">Clock Out</th>
                  <th className="py-2.5 px-4 font-semibold">Duty Shift Duration</th>
                  <th className="py-2.5 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6B7280]">
                      No staff shifts logged recently.
                    </td>
                  </tr>
                ) : (
                  shifts.map((s) => {
                    let durationText = 'Active on duty';
                    if (s.clockOutTime) {
                      const mins = Math.round(
                        (new Date(s.clockOutTime).getTime() - new Date(s.clockInTime).getTime()) /
                          60000,
                      );
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      durationText = `${h}h ${m}m`;
                    }
                    return (
                      <tr key={s.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0A192F]">
                          {s.staff.fullName}
                          <span className="block font-mono text-[11px] text-[#6B7280]">
                            {s.staff.email}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                          {s.staff.role}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(s.clockInTime).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {s.clockOutTime ? new Date(s.clockOutTime).toLocaleString('en-IN') : ''}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              !s.clockOutTime
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {durationText}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">{s.notes || '-'}</td>
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


