import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { AuditLogResponse, PaginatedResult } from '@fitnexa/shared';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

async function fetchAuditLogs(page = 1): Promise<PaginatedResult<AuditLogResponse>> {
  const { data } = await apiClient.get('/audit-logs', {
    params: { page, limit: 25 },
  });
  return data?.data || data;
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => fetchAuditLogs(page),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load audit logs"
        message="Could not retrieve the immutable audit trail."
      />
    );
  }

  const formatIST = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
          Security & Compliance Audit Trail
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          Immutable ledger recording all administrative mutations, user authentications, and role updates.
        </p>
      </div>

      {/* Audit Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp (IST)</TableHead>
            <TableHead>Event Action</TableHead>
            <TableHead>Target Resource</TableHead>
            <TableHead>Actor / Account</TableHead>
            <TableHead>Origin IP</TableHead>
            <TableHead>Payload</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs text-[#374151]">
                {formatIST(log.createdAt)}
              </TableCell>
              <TableCell>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#F5F5F0] border border-[#E5E7EB] text-[#0A192F] rounded-sm">
                  {log.action}
                </span>
              </TableCell>
              <TableCell className="text-xs font-semibold text-[#4B5563]">
                {log.resource}
              </TableCell>
              <TableCell className="text-xs text-[#111827]">
                {log.userName || log.userEmail ? (
                  <div>
                    <div className="font-medium">{log.userName || 'System'}</div>
                    <div className="text-[11px] text-[#6B7280]">{log.userEmail}</div>
                  </div>
                ) : (
                  <span className="text-[#9CA3AF]">System Internal</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-[#6B7280]">
                {log.ipAddress}
              </TableCell>
              <TableCell>
                {log.details ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setSelectedLog(log)}
                  >
                    View Diff
                  </Button>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-[#6B7280]">
            Page {data.page} of {data.totalPages} ({data.total} total events)
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
            <DialogDescription>
              Action: {selectedLog?.action} on {selectedLog?.resource}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#6B7280]">Timestamp:</span>{' '}
                <span className="font-mono">{selectedLog && formatIST(selectedLog.createdAt)}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">IP Address:</span>{' '}
                <span className="font-mono">{selectedLog?.ipAddress}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6B7280]">User Agent:</span>{' '}
                <span className="font-mono text-[11px] truncate block">{selectedLog?.userAgent}</span>
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-[#EFEFEA] p-3 rounded-sm">
              <span className="block text-[11px] font-bold text-[#374151] uppercase mb-1">
                Event Payload (Redacted)
              </span>
              <pre className="text-xs font-mono text-[#111827] overflow-x-auto">
                {JSON.stringify(selectedLog?.details, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
