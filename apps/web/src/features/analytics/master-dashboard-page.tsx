import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiClient } from '../../lib/api-client';
import { formatPaiseToInr } from '../../lib/utils';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/auth-context';

interface MasterData {
  updatedAt: string; members: number; products: number; purchases: number; devices: number; staff: number;
  collections: number; approvedExpenses: number; pendingExpenses: number; posSales: number; dues: number;
  daily: { date: string; collections: number; expenses: number; visits: number }[];
  categories: { name: string; amount: number }[]; methods: { name: string; amount: number }[];
  leads: { name: string; count: number }[]; sessions: { name: string; count: number }[];
}
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const chartLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  : value.replace(/_/g, ' ');
const links = [['Members', '/members'], ['Membership plans', '/plans'], ['Billing', '/billing'], ['Invoices', '/billing/invoices'], ['POS counter', '/pos'], ['POS sales', '/pos/sales'], ['Inventory', '/inventory'], ['Purchases', '/inventory/purchases'], ['Trainers', '/trainers'], ['Attendance', '/attendance'], ['Leads & CRM', '/leads'], ['Biometric terminals', '/devices'], ['Expenses', '/expenses'], ['Notifications', '/notifications'], ['Administration', '/settings'], ['Reports', '/reports']];

export function MasterDashboardPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [branch, setBranch] = useState('');
  const [live, setLive] = useState(true);
  const branches = useQuery<{ id: string; name: string }[]>({ queryKey: ['master-branches'], queryFn: async () => { const res = await apiClient.get('/tenant/branches'); return res.data.data || res.data; } });
  const query = useQuery<MasterData>({ queryKey: ['master-dashboard', from, to, branch], refetchInterval: live ? 30000 : false, queryFn: async () => { const res = await apiClient.get('/analytics/master-dashboard', { params: { from, to, branchId: branch || undefined } }); return res.data.data || res.data; } });
  const data = query.data;
  const field = 'h-10 border border-[#E5E7EB] bg-[#FBFBF9] px-3 text-xs text-[#0A192F] focus-visible:outline-2';
  const chart = (title: string, rows: object[], value: string, currency = false, accent = '#0A192F') => (
    <section className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 min-w-0" key={title}>
      <div className="flex items-center justify-between gap-3 mb-5"><h2 className="text-sm font-bold text-[#0A192F]">{title}</h2><span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" /></div>
      {rows.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 8, right: 16, bottom: 12, left: 0 }}><CartesianGrid stroke="#E5E7EB" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={chartLabel} interval="preserveStartEnd" minTickGap={32} tickMargin={10} height={48}/><YAxis tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={currency}/><Tooltip labelFormatter={label => chartLabel(String(label))} formatter={(v) => currency ? formatPaiseToInr(Number(v)) : Number(v)}/><Bar dataKey={value} fill={accent} radius={[2, 2, 0, 0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div> : <p className="h-64 flex items-center justify-center text-sm text-[#6B7280]">No records in this date range.</p>}
    </section>
  );
  return <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto bg-[#FBFBF9]">
    <div className="border-b border-[#E5E7EB] pb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B91C1C]">Gym command centre</p><h1 className="text-3xl font-bold text-[#0A192F] mt-2">Master Dashboard</h1><p className="text-sm text-[#6B7280] mt-2">Business performance and operations across your gym.</p></div><div className="text-xs text-[#6B7280]">{data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString('en-IN')}` : 'Loading overview'}{query.isFetching && data ? ' · Updating' : ''}</div></div>
    <div className="border border-[#E5E7EB] p-4 flex flex-wrap items-end gap-4">
      <label className="text-xs flex flex-col gap-2">From<input aria-label="From date" className={field} type="date" value={from} onChange={e => setFrom(e.target.value)}/></label>
      <label className="text-xs flex flex-col gap-2">To<input aria-label="To date" className={field} type="date" value={to} onChange={e => setTo(e.target.value)}/></label>
      {user?.role !== 'BRANCH_MANAGER' && <label className="text-xs flex flex-col gap-2">Branch<select className={field} value={branch} onChange={e => setBranch(e.target.value)}><option value="">All branches</option>{branches.data?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      <label className="text-xs flex items-center gap-2 h-10"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)}/>Auto refresh (30 seconds)</label>
      <button className={field} onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh</button>
    </div>
    {query.error && <div role="alert" className="border border-[#B91C1C] p-4 text-sm text-[#B91C1C]">{query.error instanceof Error ? query.error.message : 'Unable to load dashboard. Please retry.'}</div>}
    {query.isLoading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 w-full"/>)}</div> : data && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
        ['Collections received', formatPaiseToInr(data.collections)], ['POS invoiced sales', formatPaiseToInr(data.posSales)], ['Approved expenses', formatPaiseToInr(data.approvedExpenses)], ['Collections less expenses', formatPaiseToInr(data.collections - data.approvedExpenses)], ['Members (current)', data.members], ['Invoice dues (selected dates)', formatPaiseToInr(data.dues)], ['Pending expense approval', formatPaiseToInr(data.pendingExpenses)], ['Check-ins', data.daily.reduce((sum, day) => sum + day.visits, 0)],
      ].map(([label, value], index) => <div key={label} className="border border-[#E5E7EB] bg-[#FBFBF9] p-5" style={{ borderTop: `3px solid ${['#0F766E', '#1D4ED8', '#B91C1C', '#0A192F', '#7C3AED', '#C2410C', '#A16207', '#15803D'][index]}` }}><p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">{label}</p><p className="mt-4 text-2xl font-bold text-[#0A192F] break-words">{value}</p></div>)}</div>
      <p className="text-xs text-[#6B7280]">Money figures include tax. Collections include POS payments; POS sales are shown separately and must not be added again. Collections less expenses is cash flow, not accounting profit. Products are shared across the gym.</p>
      <section className="border border-[#E5E7EB] p-5"><h2 className="text-sm font-bold mb-5">Daily collections and approved expenses</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily}><CartesianGrid stroke="#E5E7EB" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 10 }}/><YAxis tick={{ fontSize: 10 }}/><Tooltip formatter={v => formatPaiseToInr(Number(v))}/><Legend/><Area type="monotone" dataKey="collections" name="Collections" stroke="#0A192F" fill="#E5E7EB" isAnimationActive={false}/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#B91C1C" fill="none" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div></section>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{chart('Expense breakdown by category', data.categories, 'amount', true)}{chart('Collections by payment method', data.methods, 'amount', true)}{chart('Lead pipeline (created in selected dates)', data.leads, 'count')}{chart('Training session status', data.sessions, 'count')}{chart('Daily member check-ins', data.daily.map(d => ({ name: d.date, count: d.visits })), 'count')}<section className="border border-[#E5E7EB] p-5"><h2 className="text-sm font-bold mb-5">Operations overview</h2>{[['Active products (current)', data.products], ['Purchase orders (selected dates)', data.purchases], ['Biometric terminals (current)', data.devices], ['Staff accounts (current)', data.staff]].map(([label, count]) => <div key={label} className="py-4 border-b border-[#E5E7EB] flex justify-between gap-3 text-sm"><span>{label}</span><strong>{count}</strong></div>)}</section></div>
    </>}
    <section className="border border-[#E5E7EB] p-5"><h2 className="text-sm font-bold mb-4">Open a module</h2><div className="flex flex-wrap gap-3">{links.map(([name, path]) => <Link key={path} to={path} className={`${field} inline-flex items-center hover:bg-[#F5F5F0]`}>{name}</Link>)}</div></section>
  </div>;
}
