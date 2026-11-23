import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { ReportType } from '@fitnexa/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ReportsPage() {
  const navigate = useNavigate();

  const [activeReport, setActiveReport] = useState<ReportType>(ReportType.MEMBERSHIP_SUMMARY);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await apiClient.get('/tenant/branches');
        setBranches(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch {
        // Handled gracefully
      }
    };
    fetchBranches();
  }, []);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let url = `/analytics/reports/${activeReport}?page=${page}&limit=50&startDate=${startDate}&endDate=${endDate}`;
      if (selectedBranchId) {
        url += `&branchId=${selectedBranchId}`;
      }
      const res = await apiClient.get(url);
      setReportData(res.data?.data || res.data);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, selectedBranchId, startDate, endDate, page]);

  useEffect(() => {
    setStatusFilter('');
    setMethodFilter('');
    setTextFilter('');
  }, [activeReport]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      let url = `/analytics/exports/${activeReport}?startDate=${startDate}&endDate=${endDate}`;
      if (selectedBranchId) url += `&branchId=${selectedBranchId}`;

      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `trifit-${activeReport}-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const reportTabs = [
    { type: ReportType.MEMBERSHIP_SUMMARY, label: 'Membership Lifecycle' },
    { type: ReportType.FINANCIAL_COLLECTIONS, label: 'Financial Collections' },
    { type: ReportType.ATTENDANCE_PATTERNS, label: 'Attendance Patterns' },
    { type: ReportType.INVENTORY_VELOCITY, label: 'Inventory & Stock' },
    { type: ReportType.TRAINER_PRODUCTIVITY, label: 'Trainer Productivity' },
    { type: ReportType.LEAD_CONVERSIONS, label: 'Lead CRM Conversions' },
  ];

  const visibleRecords = (Array.isArray(reportData?.records) ? reportData.records : []).filter((row: any) => {
    const matchesStatus = !statusFilter || String(row.status || '').toUpperCase() === statusFilter;
    const methodValue = String(row.method || row.paymentMethod || '').toUpperCase();
    const matchesMethod = !methodFilter || methodValue === methodFilter;
    const haystack = Object.values(row).join(' ').toLowerCase();
    return matchesStatus && matchesMethod && (!textFilter || haystack.includes(textFilter.toLowerCase()));
  });

  const chartRows = visibleRecords;
  const summaryRows = reportData?.summary
    ? [{
        __label: 'Summary',
        ...Object.fromEntries(
          Object.entries(reportData.summary)
            .filter(([, value]) => typeof value === 'number' || !Number.isNaN(Number(value)))
            .map(([key, value]) => [key, Number(value) || 0]),
        ),
      }]
    : [];
  const chartSourceRows = chartRows.length > 0 ? chartRows : summaryRows;
  const chartNumericKeys = chartSourceRows.length
    ? Object.keys(chartSourceRows[0]).filter(
        (key) =>
          key !== 'id' && key !== '__label' &&
          chartSourceRows.some((row: any) => typeof row[key] === 'number' || !Number.isNaN(Number(row[key]))),
      )
    : [];
  const chartLabelKey = chartSourceRows.length
    ? Object.keys(chartSourceRows[0]).find((key) => key !== 'id' && key !== '__label' && !chartNumericKeys.includes(key)) || '__label'
    : 'id';
  const chartData = chartSourceRows.slice(0, 24).map((row: any, index: number) => ({
    ...row,
    __label: String(row[chartLabelKey] ?? index + 1).slice(0, 18),
    ...Object.fromEntries(chartNumericKeys.map((key) => [key, Number(row[key]) || 0])),
  }));
  const chartMetricKeys = chartNumericKeys.slice(0, 2);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Business Analytics & Reporting Center
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Authoritative multi-dimensional reporting, financial reconciliation, and secure formula-injection-protected exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/')}
          >
            ← Executive Dashboard
          </Button>
          <Button
            disabled={isExporting}
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={handleExportCsv}
          >
            {isExporting ? 'Generating Export...' : ' Export Sanitized CSV'}
          </Button>
        </div>
      </div>

      {/* Report Types Tabs */}
      <div className="flex flex-wrap items-center gap-1 pb-1">
        {reportTabs.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => {
              setActiveReport(tab.type);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors ${activeReport === tab.type
                ? 'bg-[#0A192F] text-white border-[#0A192F]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border-[#E5E7EB] bg-white h-8 w-36 rounded-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-[#6B7280]">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border-[#E5E7EB] bg-white h-8 w-36 rounded-none font-mono"
            />
          </div>

          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs border border-[#E5E7EB] bg-white px-3 h-8 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

          <div className="text-xs text-[#6B7280] font-mono">
          Report Records: <span className="font-bold text-[#0A192F]">{visibleRecords.length}</span>
        </div>
      </div>

      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Search report records..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          className="text-xs border-[#E5E7EB] bg-white h-8 rounded-none"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-[#E5E7EB] bg-white px-3 h-8 rounded-none text-[#0A192F]">
          <option value="">All Statuses</option>
          {Array.from(new Set<string>((reportData?.records || []).map((row: any) => String(row.status || '').toUpperCase()).filter(Boolean))).map((status: string) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="text-xs border border-[#E5E7EB] bg-white px-3 h-8 rounded-none text-[#0A192F]">
          <option value="">All Payment Methods</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
        <div className="text-[11px] text-[#6B7280] flex items-center justify-end">Showing <span className="font-bold text-[#0A192F] mx-1">{visibleRecords.length}</span> filtered rows</div>
      </div>

      {/* Summary KPI Ribbon for Active Report */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(reportData.summary).map(([key, val]) => {
            const formattedKey = key
              .replace(/Paise$/, '')
              .replace(/([A-Z])/g, ' $1')
              .toUpperCase();
            const formattedVal = key.toLowerCase().includes('paise')
              ? formatPaiseToInr(Number(val))
              : String(val);

            return (
              <div key={key} className="bg-white border border-[#E5E7EB] p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#6B7280]">
                  {formattedKey}
                </span>
                <div className="font-mono text-lg font-extrabold text-[#0A192F]">
                  {formattedVal}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {chartData.length > 0 && chartMetricKeys.length > 0 && (
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#0A192F]">Report Trend</h2>
              <p className="text-[11px] text-[#6B7280] mt-1">Visual summary of the selected report data.</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetricKeys.length > 1 && chartRows.length > 0 ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="__label" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {chartMetricKeys.map((key, index) => (
                    <Line key={key} type="monotone" dataKey={key} name={key.replace(/([A-Z])/g, ' $1')} stroke={index === 0 ? '#0A192F' : '#B91C1C'} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="__label" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip />
                  {chartMetricKeys.map((key, index) => (
                    <Bar key={key} dataKey={key} name={key.replace(/Paise$/, '').replace(/([A-Z])/g, ' $1')} fill={index === 0 ? '#0A192F' : '#B91C1C'} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dynamic Report Data Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : visibleRecords.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6B7280]">
              No records found for the selected reporting period and branch.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  {Object.keys(visibleRecords[0])
                    .filter((col) => col !== 'id')
                    .map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col.replace(/Paise$/, '').replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-xs">
                {visibleRecords.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-white transition-colors">
                    {Object.keys(row)
                      .filter((col) => col !== 'id')
                      .map((col) => {
                        const val = row[col];
                        const isPaise = col.toLowerCase().includes('paise');
                        return (
                          <td key={col} className="py-2.5 px-3">
                            {isPaise ? (
                              <span className="font-mono font-bold text-[#0A192F]">
                                {formatPaiseToInr(val)}
                              </span>
                            ) : typeof val === 'string' && val.includes('T') && val.includes('Z') ? (
                              <span className="font-mono text-[11px] text-[#6B7280]">
                                {new Date(val).toLocaleDateString('en-IN')}
                              </span>
                            ) : (
                              <span>{String(val ?? '-')}</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-bold text-[#0A192F]">{visibleRecords.length}</span> of{' '}
            <span className="font-bold text-[#0A192F]">{reportData?.totalRecords || 0}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Previous
            </Button>
            <span className="font-mono font-medium text-[#0A192F]">Page {page}</span>
            <Button
              variant="outline"
              disabled={!reportData?.records || reportData.records.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



