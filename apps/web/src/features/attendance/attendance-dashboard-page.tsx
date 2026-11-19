import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

interface OccupancyData {
  branchId?: string;
  activeCount: number;
  todayTotalCheckIns: number;
  todayUniqueMembers: number;
}

interface RecentActivity {
  id: string;
  direction: string;
  source: string;
  timestamp: string;
  member?: {
    id: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  device?: {
    id: string;
    name: string;
  };
}

export function AttendanceDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const [occRes, histRes] = await Promise.all([
          apiClient.get('/attendance/occupancy'),
          apiClient.get('/attendance/history?limit=8'),
        ]);
        setOccupancy(occRes.data.data);
        setRecentActivities(histRes.data.data.items || []);
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeCount = occupancy?.activeCount || 0;
  const todayCheckIns = occupancy?.todayTotalCheckIns || 0;
  const todayUnique = occupancy?.todayUniqueMembers || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Attendance & Access Control
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time facility occupancy, biometric gate telemetry, and front-desk check-in management.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh Telemetry
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/attendance/check-in')}
          >
            Front-Desk Fast Check-in
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Real-time Occupancy */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Current In-Gym Occupancy
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0A192F] tracking-tight">
              {activeCount}
            </span>
            <span className="text-xs text-[#6B7280]">members active</span>
          </div>
          <div className="mt-3">
            <Button
              variant="ghost"
              className="p-0 h-auto text-xs font-semibold text-[#B91C1C] hover:underline hover:bg-transparent"
              onClick={() => navigate('/attendance/active')}
            >
              View Active Roster →
            </Button>
          </div>
        </div>

        {/* Today Total Check-ins */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Today's Check-ins
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0A192F] tracking-tight">
              {todayCheckIns}
            </span>
            <span className="text-xs text-[#6B7280]">gate taps</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-3">
            Includes front-desk and turnstile taps
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Unique Members Today
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0A192F] tracking-tight">
              {todayUnique}
            </span>
            <span className="text-xs text-[#6B7280]">distinct athletes</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-3">
            Deduped by member profile code
          </p>
        </div>

        {/* Access Policies & Devices */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Hardware & Policy Engine
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-between text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
              onClick={() => navigate('/devices')}
            >
              <span>Biometric Terminals</span>
              <span>→</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
              onClick={() => navigate('/attendance/policies')}
            >
              <span>Access Rules & Dues Policy</span>
              <span>→</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#0A192F]">Manual Check-in Desk</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Search athlete by name, code or phone</p>
          </div>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none"
            onClick={() => navigate('/attendance/check-in')}
          >
            Check In
          </Button>
        </div>
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#0A192F]">Staff Shift Attendance</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Clock-in and clock-out duty registers</p>
          </div>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/staff-attendance')}
          >
            Staff Shifts
          </Button>
        </div>
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#0A192F]">Attendance Corrections</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Audit requests and manager approvals</p>
          </div>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/attendance/corrections')}
          >
            Review
          </Button>
        </div>
      </div>

      {/* Recent Gate Activity Feed */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Recent Gate Activity Ledger
          </h2>
          <Button
            variant="ghost"
            className="p-0 h-auto text-xs font-semibold text-[#0A192F] hover:underline hover:bg-transparent"
            onClick={() => navigate('/attendance/history')}
          >
            View Complete Ledger →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Member</th>
                <th className="py-2.5 px-4 font-semibold">Code / Phone</th>
                <th className="py-2.5 px-4 font-semibold">Direction</th>
                <th className="py-2.5 px-4 font-semibold">Source</th>
                <th className="py-2.5 px-4 font-semibold">Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                    No gate events recorded today yet.
                  </td>
                </tr>
              ) : (
                recentActivities.map((act) => {
                  const isCheckIn = act.direction === 'CHECK_IN';
                  return (
                    <tr key={act.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#0A192F]">
                        {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0A192F]">
                        {act.member ? (
                          <button
                            type="button"
                            className="hover:underline text-left text-[#0A192F]"
                            onClick={() => navigate(`/members/${act.member?.id}`)}
                          >
                            {act.member.firstName} {act.member.lastName}
                          </button>
                        ) : (
                          'Staff / Unregistered'
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        {act.member?.memberCode || act.member?.phone || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            isCheckIn
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {act.direction.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                        {act.source}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        {act.device?.name || 'Front Desk Console'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
