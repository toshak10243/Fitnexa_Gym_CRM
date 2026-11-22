import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
        const occRaw = occRes.data?.data || occRes.data;
        setOccupancy(occRaw);
        const histRaw = histRes.data?.data || histRes.data;
        setRecentActivities(histRaw?.items || (Array.isArray(histRaw) ? histRaw : []));
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [refreshKey]);

  const activeCount = occupancy?.activeCount || 0;
  const todayCheckIns = occupancy?.todayTotalCheckIns || 0;
  const todayUnique = occupancy?.todayUniqueMembers || 0;

  const hourlyFootfall = useMemo(() => {
    const buckets = new Map<number, number>();
    recentActivities.filter((activity) => activity.direction === 'CHECK_IN' || activity.direction === 'IN').forEach((activity) => {
      const hour = new Date(activity.timestamp).getHours();
      buckets.set(hour, (buckets.get(hour) || 0) + 1);
    });
    return Array.from({ length: 24 }, (_, hour) => ({
      time: `${String(hour).padStart(2, '0')}:00`,
      entries: buckets.get(hour) || 0,
      rush: buckets.get(hour) ? 'Recorded check-ins' : 'No recorded check-ins',
    }));
  }, [recentActivities]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real-time Occupancy */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#1D4ED8] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Current In-Gym Occupancy
            </span>
            <div className="h-8 w-8 rounded-none bg-blue-100/70 border border-blue-200 text-[#1D4ED8] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0A192F] tracking-tight">
              {activeCount}
            </span>
            <span className="text-xs text-[#6B7280]">athletes active</span>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse ml-1" />
          </div>
          <div className="mt-3">
            <Button
              variant="ghost"
              className="p-0 h-auto text-xs font-semibold text-[#1D4ED8] hover:underline hover:bg-transparent"
              onClick={() => navigate('/attendance/active')}
            >
              View Active Roster â†’
            </Button>
          </div>
        </div>

        {/* Today Total Check-ins */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-emerald-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Today&apos;s Total Check-ins
            </span>
            <div className="h-8 w-8 rounded-none bg-emerald-100/70 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0A192F] tracking-tight">
              {todayCheckIns}
            </span>
            <span className="text-xs text-[#6B7280]">gate taps</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-3">
            Front-desk counter + Biometric turnstiles
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-purple-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Unique Members Today
            </span>
            <div className="h-8 w-8 rounded-none bg-purple-100/70 border border-purple-200 text-purple-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
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

        {/* Hardware & Policy Engine */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#0A192F] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Biometric Terminals & Rules
            </span>
            <div className="h-8 w-8 rounded-none bg-slate-100 border border-slate-300 text-[#0A192F] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-between text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
              onClick={() => navigate('/devices')}
            >
              <span>Biometric Terminals</span>
              <span>â†’</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
              onClick={() => navigate('/attendance/policies')}
            >
              <span>Access Rules & Dues Policy</span>
              <span>â†’</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hourly Floor Footfall Dynamics Graph */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Gym Floor Footfall & Peak Workout Rush (Today)
              </h2>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Live turnstile check-in pattern across operational workout hours.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold">
              Peak: 07:00-09:00 & 18:00-20:00
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyFootfall} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attRushGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="time" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#0A192F] text-[#FBFBF9] p-2.5 text-xs border border-[#162E52] shadow-sm">
                        <div className="font-bold">{item.time} hrs Â· {item.rush}</div>
                        <div className="text-emerald-400 font-mono text-sm mt-1">
                          {item.entries} athlete taps
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="entries"
                stroke="#1D4ED8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#attRushGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
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
            size="sm"
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] rounded-none text-xs"
            onClick={() => navigate('/attendance/check-in')}
          >
            Launch Desk
          </Button>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#0A192F]">Active Floor Occupancy</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Live list of athletes on the gym floor</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white"
            onClick={() => navigate('/attendance/active')}
          >
            Inspect Floor
          </Button>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#0A192F]">Historical Audit Log</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Full check-in and checkout history</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white"
            onClick={() => navigate('/attendance/history')}
          >
            View History
          </Button>
        </div>
      </div>

      {/* Live Biometric & Check-in Feed */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
              Live Gate Telemetry Stream
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Recent entrance and exit events reported by biometrics and front desk.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
            onClick={() => navigate('/attendance/history')}
          >
            Full Ledger â†’
          </Button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            No access events recorded today yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] bg-white">
            {recentActivities.map((act) => (
              <div key={act.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#F9F9F6] transition-colors">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none ${
                      act.direction === 'IN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {act.direction === 'IN' ? 'Entry' : 'Exit'}
                  </span>
                  <div>
                    <div className="font-semibold text-[#0A192F]">
                      {act.member ? ([act.member.firstName, act.member.lastName].filter(Boolean).join(' ') || act.member.memberCode || 'Member') : 'Walk-in / Unregistered'}
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono">
                      {act.member?.memberCode || 'N/A'}  Source: {act.source}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#0A192F] font-mono font-bold">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-[#6B7280]">
                    {act.device?.name || 'Front Desk Terminal'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


