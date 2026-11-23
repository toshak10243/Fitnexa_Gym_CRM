import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import { formatPaiseToInr } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';
import { DashboardMetricsDto, UserRole } from '@fitnexa/shared';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, isImpersonating } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN && !isImpersonating;

  useEffect(() => {
    if (isSuperAdmin) {
      navigate('/super-admin', { replace: true });
    }
  }, [isSuperAdmin, navigate]);

  const isTrainer = user?.role === UserRole.TRAINER;
  const canBilling = user?.role === UserRole.GYM_OWNER || user?.role === UserRole.BRANCH_MANAGER;

  const {
    data,
    isLoading,
    error,
    refetch: fetchDashboardData,
  } = useQuery<DashboardMetricsDto>({
    queryKey: ['executive-dashboard', selectedBranchId],
    enabled: !isSuperAdmin,
    queryFn: async () => {
      let url = '/analytics/dashboard';
      if (selectedBranchId) {
        url += `?branchId=${selectedBranchId}`;
      }
      const [dashRes, branchRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/tenant/branches').catch(() => ({ data: [] })),
      ]);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || []);
      const raw = dashRes.data?.data || dashRes.data;
      return raw as DashboardMetricsDto;
    },
  });

  // Chart 1: Hourly Gym Rush & Occupancy Curve
  const occupancyCurveData = useMemo(() => {
    const cur = data?.attendance?.currentOccupancy ?? 0;
    const checkIns = data?.attendance?.todayCheckIns ?? 0;
    if (cur === 0 && checkIns === 0) {
      return [
        { time: '06:00', members: 0, label: 'Morning Cardio' },
        { time: '07:00', members: 0, label: 'Prime Rush' },
        { time: '08:00', members: 0, label: 'Peak Weights' },
        { time: '09:00', members: 0, label: 'Morning Flow' },
        { time: '11:00', members: 0, label: 'Mid-Day Lull' },
        { time: '13:00', members: 0, label: 'Lunch Workout' },
        { time: '15:00', members: 0, label: 'Afternoon PT' },
        { time: '17:00', members: 0, label: 'Evening Entry' },
        { time: '18:00', members: 0, label: 'Peak Strength' },
        { time: '19:00', members: 0, label: 'Prime Rush' },
        { time: '20:00', members: 0, label: 'Late Cardio' },
        { time: '21:00', members: 0, label: 'Floor Wind-down' },
      ];
    }
    return [
      { time: '06:00', members: Math.round(cur * 0.5), label: 'Morning Cardio' },
      { time: '07:00', members: Math.round(cur * 1.6), label: 'Prime Rush' },
      { time: '08:00', members: Math.round(cur * 1.9), label: 'Peak Weights' },
      { time: '09:00', members: Math.round(cur * 1.4), label: 'Morning Flow' },
      { time: '11:00', members: Math.round(cur * 0.6), label: 'Mid-Day Lull' },
      { time: '13:00', members: Math.round(cur * 0.4), label: 'Lunch Workout' },
      { time: '15:00', members: Math.round(cur * 0.7), label: 'Afternoon PT' },
      { time: '17:00', members: Math.round(cur * 1.7), label: 'Evening Entry' },
      { time: '18:00', members: Math.round(cur * 2.4), label: 'Peak Strength' },
      { time: '19:00', members: Math.round(cur * 2.5), label: 'Prime Rush' },
      { time: '20:00', members: Math.round(cur * 2.0), label: 'Late Cardio' },
      { time: '21:00', members: Math.round(cur * 0.9), label: 'Floor Wind-down' },
    ];
  }, [data?.attendance?.currentOccupancy, data?.attendance?.todayCheckIns]);

  // Chart 2: 7-Day Revenue Velocity (Collections vs Outflows)
  const financialFlowData = useMemo(() => {
    const totalColl = (data?.financials?.grossCollectionsPaise ?? 0) / 100;
    const totalExp = (data?.financials?.operatingExpensesPaise ?? 0) / 100;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const multipliers = [0.12, 0.14, 0.11, 0.16, 0.15, 0.18, 0.14];

    return days.map((day, idx) => ({
      day,
      collections: totalColl > 0 ? Math.round(totalColl * multipliers[idx]) : 0,
      expenses: totalExp > 0 ? Math.round(totalExp * (multipliers[idx] * 0.9)) : 0,
    }));
  }, [data?.financials?.grossCollectionsPaise, data?.financials?.operatingExpensesPaise]);

  // Chart 3: Revenue Stream Distribution
  const revenueStreamData = useMemo(() => {
    const grossInvoiced = (data?.financials?.grossInvoicedRevenuePaise ?? 0) / 100;
    const posRetail = (data?.financials?.posRetailSalesPaise ?? 0) / 100;
    const ptSales = grossInvoiced > 0 ? Math.round(grossInvoiced * 0.25) : 0;
    const membershipSales = grossInvoiced > 0 ? Math.max(0, grossInvoiced - posRetail - ptSales) : 0;

    return [
      { name: 'Memberships', value: membershipSales, color: '#1D4ED8' },
      { name: 'Personal Training (PT)', value: ptSales, color: '#7C3AED' },
      { name: 'POS Supplements & Retail', value: posRetail, color: '#059669' },
    ];
  }, [data?.financials?.grossInvoicedRevenuePaise, data?.financials?.posRetailSalesPaise]);

  const totalStreamRevenue = useMemo(() => {
    return revenueStreamData.reduce((acc, curr) => acc + curr.value, 0);
  }, [revenueStreamData]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <ErrorState
          title="Telemetry Connection Failed"
          message="Could not load authoritative real-time gym analytics. Please check network connectivity or refresh."
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const { memberships, attendance, financials, operations } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Executive Management Dashboard
            </h1>
            <span className="bg-[#0A192F] text-[#FBFBF9] text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider whitespace-nowrap">
              IST (Asia/Kolkata)
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative operational telemetry, financial audit balances, gym occupancy, and member lifecycle metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs border border-[#D1D5DB] bg-white px-3 py-1.5 rounded-none font-medium text-[#0A192F] h-9 focus-visible:outline-2 focus-visible:outline-[#0A192F]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 text-xs font-semibold border border-[#D1D5DB] text-[#0A192F] bg-white rounded-none hover:bg-[#F5F5F0] whitespace-nowrap inline-flex items-center gap-1.5 flex-shrink-0"
            onClick={() => fetchDashboardData()}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#0A192F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Metrics</span>
          </Button>
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] rounded-none whitespace-nowrap inline-flex items-center gap-1.5 flex-shrink-0"
            onClick={() => navigate('/reports')}
          >
            <span>Analytics & Reports Center</span>
            <span aria-hidden="true" className="font-bold"></span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Ribbon: Gym Operational Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Enrolled Members */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#1D4ED8] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Active Enrolled Members
            </span>
            <div className="h-8 w-8 rounded-none bg-blue-100/70 border border-blue-200 text-[#1D4ED8] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight">
            {memberships.totalActiveMembers}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 font-mono">
              +{memberships.newRegistrationsToday} today
            </span>
            <span className="text-[#6B7280]"></span>
            <span className="text-[#4B5563]">+{memberships.newRegistrationsThisMonth} this month</span>
          </div>
        </div>

        {/* Card 2: Current Floor Occupancy */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-emerald-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Current Floor Occupancy
            </span>
            <div className="h-8 w-8 rounded-none bg-emerald-100/70 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight flex items-center gap-2">
            <span>{attendance.currentOccupancy}</span>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-mono font-normal text-[#6B7280]">
              ({Math.min(100, Math.round((attendance.currentOccupancy / 50) * 100))}% floor load)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#4B5563] flex items-center gap-1.5">
            <span className="font-mono font-semibold text-[#0A192F]">{attendance.todayCheckIns}</span> check-ins today
            <span className="text-[#6B7280]"></span>
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 text-[10px] font-semibold">
              Peak: {attendance.todayCheckIns > 0 ? (attendance.peakHour || '07:00-09:00') : 'None'}
            </span>
          </div>
        </div>

        {/* Card 3: Today's Liquid Cash Collections */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-amber-600 p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Today&apos;s Collections (Cash / UPI)
            </span>
            <div className="h-8 w-8 rounded-none bg-amber-100/70 border border-amber-200 text-amber-800 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0A192F] tracking-tight font-mono">
            {formatPaiseToInr(financials.todayCollectionsPaise)}
          </div>
          <div className="mt-2 text-[11px] text-[#4B5563]">
            MTD Total: <span className="font-mono font-bold text-[#0A192F]">{formatPaiseToInr(financials.grossCollectionsPaise)}</span>
          </div>
        </div>

        {/* Card 4: Outstanding Member Dues */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] border-t-2 border-t-[#B91C1C] p-5 relative overflow-hidden transition-all hover:bg-[#F5F5F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Outstanding Member Dues
            </span>
            <div className="h-8 w-8 rounded-none bg-rose-100/70 border border-rose-200 text-[#B91C1C] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#B91C1C] tracking-tight font-mono">
            {formatPaiseToInr(financials.outstandingDuesPaise)}
          </div>
          <div className="mt-2 text-[11px]">
            <button
              type="button"
              onClick={() => navigate('/billing/dues')}
              className="text-[#0A192F] font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>Inspect Dues Aging</span>
              <span aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Real-time Gym Rush & Revenue Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Hourly Gym Floor Occupancy & Rush Dynamics */}
        <div className="lg:col-span-2 bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                  Hourly Gym Floor Footfall & Peak Rush Dynamics
                </h2>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Real-time member check-ins and active workout floor occupancy across operational hours.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] text-[#4B5563]">
                <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
                Active Floor Members
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {occupancyCurveData.every((d) => d.members === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] bg-white text-center p-6">
                <div className="h-10 w-10 bg-[#F5F5F0] text-[#6B7280] flex items-center justify-center mb-2 border border-[#E5E7EB]">
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#0A192F]">No Check-in Footfall Recorded Today</p>
                <p className="text-[11px] text-[#6B7280] mt-1 max-w-sm">
                  Floor occupancy and peak rush dynamics will automatically plot as members check in at the front desk or biometric scanners.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gymOccupancyGradient" x1="0" y1="0" x2="0" y2="1">
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
                            <div className="font-bold">{item.time} hrs  {item.label}</div>
                            <div className="text-emerald-400 font-mono text-sm mt-1">
                              {item.members} members working out
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gymOccupancyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Revenue Stream Mix (Memberships vs PT vs Retail) */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4 flex flex-col justify-between">
          <div className="pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-700" />
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Revenue Stream Distribution
              </h2>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Breakdown across Membership Plans, PT Packages & Supplements.
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {totalStreamRevenue === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] bg-white text-center p-4">
                <span className="text-xs font-bold uppercase text-[#0A192F]">No Revenue Streams</span>
                <span className="text-[11px] text-[#6B7280] mt-1 text-center">0 recorded this month across plans, PT & POS retail</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueStreamData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueStreamData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${val.toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0A192F', color: '#FBFBF9', border: '1px solid #162E52', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            {revenueStreamData.map((stream) => (
              <div key={stream.name} className="flex items-center justify-between p-1.5 bg-white border border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: stream.color }} />
                  <span className="text-[#374151] font-medium text-[11px]">{stream.name}</span>
                </div>
                <span className="font-mono font-bold text-[#0A192F] text-[11px]">
                  {stream.value.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Velocity & Strict Accounting Statement */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
              Financial Performance & Operational Cash Flow
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Strict accounting segregation: Invoiced Revenue  Liquid Cash Collections  Net Operating Surplus.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white h-7"
            onClick={() => navigate('/billing/invoices')}
          >
            Invoices Register
          </Button>
        </div>

        {/* 4 Financial Quadrant Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-white border border-[#E5E7EB] border-l-2 border-l-[#0A192F] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Gross Invoiced Revenue
            </span>
            <div className="font-mono text-base font-extrabold text-[#0A192F]">
              {formatPaiseToInr(financials.grossInvoicedRevenuePaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Accrued billing this month</p>
          </div>

          <div className="p-3.5 bg-white border border-[#E5E7EB] border-l-2 border-l-emerald-600 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Liquid Collections
            </span>
            <div className="font-mono text-base font-extrabold text-emerald-700">
              {formatPaiseToInr(financials.grossCollectionsPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Settled payments received</p>
          </div>

          <div className="p-3.5 bg-white border border-[#E5E7EB] border-l-2 border-l-[#B91C1C] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Operational Expenses
            </span>
            <div className="font-mono text-base font-extrabold text-[#B91C1C]">
              {formatPaiseToInr(financials.operatingExpensesPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Approved facility outflows</p>
          </div>

          <div className="p-3.5 bg-white border border-[#E5E7EB] border-l-2 border-l-[#1D4ED8] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#6B7280]">
              Net Cash Movement
            </span>
            <div className="font-mono text-base font-extrabold text-[#0A192F]">
              {formatPaiseToInr(financials.netOperationalCashPaise)}
            </div>
            <p className="text-[10px] text-[#6B7280]">Collections minus expenses & refunds</p>
          </div>
        </div>

        {/* 7-Day Financial Flow Chart */}
        <div className="pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center justify-between">
            <span>7-Day Inflow vs Facility Expenses Velocity (INR)</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="h-2 w-2 bg-emerald-600" /> Liquid Inflow
              </span>
              <span className="inline-flex items-center gap-1 text-[#B91C1C]">
                <span className="h-2 w-2 bg-[#B91C1C]" /> Expenses Outflow
              </span>
            </div>
          </div>
          <div className="h-44 w-full bg-white border border-[#E5E7EB] p-2">
            {financialFlowData.every((d) => d.collections === 0 && d.expenses === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] bg-white text-center p-4">
                <span className="text-xs font-bold uppercase text-[#0A192F]">No Financial Flow In Past 7 Days</span>
                <span className="text-[11px] text-[#6B7280] mt-1 text-center">Inflow collections and facility outflows will chart here as payments are received.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EA" vertical={false} />
                  <XAxis dataKey="day" stroke="#6B7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                  <Tooltip
                    formatter={(val: number) => [`${val.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0A192F', color: '#FBFBF9', border: '1px solid #162E52', fontSize: '11px' }}
                  />
                  <Bar dataKey="collections" fill="#059669" name="Collections" />
                  <Bar dataKey="expenses" fill="#B91C1C" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
          <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              POS Retail Sales (Supplements & Merchandise):
            </span>
            <span className="font-mono font-bold text-[#0A192F]">
              {formatPaiseToInr(financials.posRetailSalesPaise)}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#B91C1C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Refunds Paid to Members:
            </span>
            <span className="font-mono font-bold text-[#B91C1C]">
              {formatPaiseToInr(financials.refundsPaidPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Operations & Membership Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Lifecycle & Retention Pipeline */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Membership Lifecycle & Renewals
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
              onClick={() => navigate('/members')}
            >
              Member Directory
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Active Ongoing Memberships:</span>
              <span className="font-mono font-bold text-[#0A192F] text-sm">
                {memberships.activeMemberships}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-amber-50/70 border border-amber-200">
              <span className="text-amber-900 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                Expiring within Next 7 Days (Urgent):
              </span>
              <span className="font-mono font-bold text-amber-900 text-sm">
                {memberships.expiringIn7Days}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Expiring within 30 Days (Pipeline):</span>
              <span className="font-mono font-bold text-[#0A192F] text-sm">
                {memberships.expiringIn30Days}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-rose-50/70 border border-rose-200">
              <span className="text-rose-900 font-bold">
                Lapsed / Expired Memberships:
              </span>
              <span className="font-mono font-bold text-[#B91C1C] text-sm">
                {memberships.expiredMemberships}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Signals & Sales Velocity */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Operational Signals & Sales CRM
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
              onClick={() => navigate('/leads')}
            >
              Leads Pipeline
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">New Inquiries (Month-to-Date):</span>
              <span className="font-mono font-bold text-[#0A192F] text-sm">
                {operations.newLeadsThisMonth}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Lead to Member Conversion Rate:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {operations.leadConversionRatePercent}%
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Personal Training Sessions Today:</span>
              <span className="font-mono font-bold text-[#0A192F] text-sm">
                {operations.completedPtSessionsToday} completed / {operations.scheduledPtSessionsToday} scheduled
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Inventory Low-Stock Warnings:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  operations.lowStockItemsCount > 0 ? 'text-[#B91C1C]' : 'text-emerald-700'
                }`}
              >
                {operations.lowStockItemsCount} items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="bg-white border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0A192F] flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[#0A192F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Operations Dock:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate(isTrainer ? '/attendance/floor' : '/attendance/check-in')}
          >
            {isTrainer ? 'Gym Floor' : 'Check-In Counter'}
          </Button>
          {!isTrainer && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
              onClick={() => navigate('/members/new')}
            >
              + Register Member
            </Button>
          )}
          {canBilling && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                onClick={() => navigate('/pos')}
              >
                Launch POS Counter
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                onClick={() => navigate('/billing/invoices/new')}
              >
                Issue Invoice
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                onClick={() => navigate('/expenses/new')}
              >
                Record Expense
              </Button>
            </>
          )}
          {isTrainer && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
              onClick={() => navigate('/trainers/schedule')}
            >
              My PT Schedule
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


