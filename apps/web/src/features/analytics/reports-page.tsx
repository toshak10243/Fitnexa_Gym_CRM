import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { ReportType } from '@fitnexa/shared';

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
      link.setAttribute('download', `fitnexa-${activeReport}-${endDate}.csv`);
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
            {isExporting ? 'Generating Export...' : '⬇ Export Sanitized CSV'}
          </Button>
        </div>
      </div>

      {/* Report Types Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#E5E7EB] pb-2">
        {reportTabs.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => {
              setActiveReport(tab.type);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
              activeReport === tab.type
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
          Report Records: <span className="font-bold text-[#0A192F]">{reportData?.totalRecords || 0}</span>
        </div>
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

      {/* Dynamic Report Data Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !reportData?.records || reportData.records.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6B7280]">
              No records found for the selected reporting period and branch.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  {Object.keys(reportData.records[0])
                    .filter((col) => col !== 'id')
                    .map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col.replace(/Paise$/, '').replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-xs">
                {reportData.records.map((row: any, idx: number) => (
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
            Showing <span className="font-bold text-[#0A192F]">{reportData?.records?.length || 0}</span> of{' '}
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
