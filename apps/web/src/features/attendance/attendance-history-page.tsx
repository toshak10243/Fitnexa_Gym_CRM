import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

interface AttendanceHistoryItem {
  id: string;
  timestamp: string;
  direction: string;
  source: string;
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
    deviceCode: string;
  };
  accessDecision?: {
    decision: string;
    reasonCode: string;
    isOverridden: boolean;
    overrideReason?: string;
  };
  session?: {
    id: string;
    status: string;
    durationInMinutes?: number;
  };
}

export function AttendanceHistoryPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<AttendanceHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const limit = 20;

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let url = `/attendance/history?page=${page}&limit=${limit}`;
      if (directionFilter) url += `&direction=${directionFilter}`;
      if (sourceFilter) url += `&source=${sourceFilter}`;

      const res = await apiClient.get(url);
      const raw = res.data?.data || res.data;
      setItems(raw?.items || (Array.isArray(raw) ? raw : []));
      setTotal(raw?.meta?.total ?? raw?.total ?? 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, directionFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Attendance Event Ledger
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Immutable chronological audit log of all turnstile taps, biometric pushes, and manual check-ins.
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
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none"
            onClick={() => navigate('/attendance/check-in')}
          >
            Front-Desk Check-in
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-[#6B7280] mr-2">Direction:</label>
            <select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-[#E5E7EB] bg-white px-2 py-1.5 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">All Directions</option>
              <option value="CHECK_IN">CHECK IN</option>
              <option value="CHECK_OUT">CHECK OUT</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-[#6B7280] mr-2">Source:</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-[#E5E7EB] bg-white px-2 py-1.5 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">All Sources</option>
              <option value="MANUAL_FRONT_DESK">MANUAL FRONT DESK</option>
              <option value="BIOMETRIC_DEVICE">BIOMETRIC DEVICE</option>
              <option value="BARCODE_SCANNER">BARCODE SCANNER</option>
              <option value="RFID_CARD">RFID CARD</option>
              <option value="MOBILE_QR">MOBILE QR</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-[#6B7280]">
          Total Logged Events: <strong className="text-[#0A192F]">{total}</strong>
        </span>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Event Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Member</th>
                  <th className="py-2.5 px-4 font-semibold">Direction</th>
                  <th className="py-2.5 px-4 font-semibold">Access Decision</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Terminal</th>
                  <th className="py-2.5 px-4 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                      No attendance events found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const isCheckIn = row.direction === 'CHECK_IN';
                    return (
                      <tr key={row.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(row.timestamp).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(row.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0A192F]">
                          {row.member ? (
                            <button
                              type="button"
                              className="hover:underline text-left text-[#0A192F]"
                              onClick={() => navigate(`/members/${row.member?.id}`)}
                            >
                              {row.member.firstName} {row.member.lastName}
                              <span className="block text-[11px] font-mono text-[#6B7280]">
                                {row.member.memberCode} | {row.member.phone}
                              </span>
                            </button>
                          ) : (
                            <span className="text-[#6B7280]">Unmapped / Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              isCheckIn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {row.direction.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {row.accessDecision ? (
                            <div>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                                  row.accessDecision.decision === 'GRANTED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {row.accessDecision.decision}
                              </span>
                              <span className="block text-[10px] text-[#6B7280] mt-0.5">
                                {row.accessDecision.reasonCode}
                              </span>
                              {row.accessDecision.isOverridden && (
                                <span className="block text-[9px] text-[#B91C1C] font-semibold">
                                  OVERRIDDEN: {row.accessDecision.overrideReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                          {row.source}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">
                          {row.device ? (
                            <span>
                              {row.device.name}
                              <span className="block font-mono text-[10px] text-[#9CA3AF]">
                                {row.device.deviceCode}
                              </span>
                            </span>
                          ) : (
                            'Front Desk'
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {row.session?.durationInMinutes != null
                            ? `${row.session.durationInMinutes} mins`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
