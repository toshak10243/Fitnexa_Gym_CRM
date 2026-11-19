import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { HealthCheckResponse } from '@fitnexa/shared';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

async function fetchHealth(): Promise<HealthCheckResponse> {
  const { data } = await apiClient.get<HealthCheckResponse>('/health');
  return data;
}

export function VerificationPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
              Phase 0 Infrastructure Verification
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Real-time health telemetry across the Fitnexa micro-architecture.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
          >
            Re-check Services
          </Button>
        </div>
        <ErrorState
          title="Backend Service Unreachable"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to connect to the Fitnexa API server on port 3000. Ensure the backend process is running.'
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isDbUp = data?.services.database.status === 'up';
  const isRedisUp = data?.services.redis.status === 'up';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
            Phase 0 Infrastructure Verification
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time health telemetry across the Fitnexa modular monorepo stack.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => refetch()}
          isLoading={isFetching}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Primary Metrics: 2 columns or 4 columns (strictly NOT 3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-4 rounded-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            System Status
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                data?.status === 'ok'
                  ? 'bg-[#10B981]'
                  : data?.status === 'degraded'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#B91C1C]'
              }`}
            />
            <span className="text-base font-bold text-[#0A192F] uppercase">
              {data?.status}
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1 font-mono">
            {data?.status === 'ok'
              ? 'All services operational'
              : 'Partial functionality available'}
          </p>
        </div>

        <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-4 rounded-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Uptime
          </div>
          <div className="mt-2 text-base font-bold font-mono text-[#0A192F]">
            {data?.uptime}s
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">Continuous uptime</p>
        </div>

        <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-4 rounded-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            PostgreSQL 19
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isDbUp ? 'bg-[#10B981]' : 'bg-[#B91C1C]'
              }`}
            />
            <span className="text-base font-bold font-mono text-[#0A192F]">
              {isDbUp ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1 font-mono">
            {data?.services.database.responseTimeMs ?? 0}ms latency
          </p>
        </div>

        <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-4 rounded-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Redis Cache & BullMQ
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isRedisUp ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
              }`}
            />
            <span className="text-base font-bold font-mono text-[#0A192F]">
              {isRedisUp ? 'Connected' : 'Offline / Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1 font-mono">
            {isRedisUp
              ? `${data?.services.redis.responseTimeMs ?? 0}ms latency`
              : 'Standby mode'}
          </p>
        </div>
      </div>

      {/* Subsystem Telemetry Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wide">
          Subsystem Diagnostics
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subsystem</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency / Metric</TableHead>
              <TableHead>Diagnostic Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold text-[#0A192F]">
                PostgreSQL Engine
              </TableCell>
              <TableCell className="text-xs text-[#6B7280]">
                Primary Relational Storage
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm ${
                    isDbUp
                      ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                      : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                  }`}
                >
                  {isDbUp ? 'HEALTHY' : 'UNREACHABLE'}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {data?.services.database.responseTimeMs !== undefined
                  ? `${data.services.database.responseTimeMs} ms`
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-xs text-[#4B5563]">
                {data?.services.database.error || 'Port 5432 verified; query latency nominal.'}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-semibold text-[#0A192F]">
                Redis / BullMQ
              </TableCell>
              <TableCell className="text-xs text-[#6B7280]">
                Distributed Cache & Job Queue
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm ${
                    isRedisUp
                      ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                      : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                  }`}
                >
                  {isRedisUp ? 'HEALTHY' : 'STANDBY'}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {data?.services.redis.responseTimeMs !== undefined
                  ? `${data.services.redis.responseTimeMs} ms`
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-xs text-[#4B5563]">
                {isRedisUp
                  ? 'Ping latency nominal; rate limiter active.'
                  : 'Non-blocking in dev; available when Redis server is started.'}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-semibold text-[#0A192F]">
                API Memory Footprint
              </TableCell>
              <TableCell className="text-xs text-[#6B7280]">
                Node.js V8 Heap & RSS
              </TableCell>
              <TableCell>
                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                  NOMINAL
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs">
                Heap: {data?.services.memory.heapUsedMb} MB
              </TableCell>
              <TableCell className="text-xs text-[#4B5563]">
                Resident Set Size: {data?.services.memory.rssMb} MB.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
