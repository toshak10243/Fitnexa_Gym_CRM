import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@fitnexa/shared';

interface DeviceItem {
  id: string;
  name: string;
  deviceCode: string;
  deviceType: string;
  manufacturer: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  status: string;
  lastHeartbeat?: string;
  branch?: {
    id: string;
    name: string;
  };
  _count?: {
    mappings: number;
    events: number;
  };
}

export function DevicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRegister =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN;
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/devices');
      const raw = res.data?.data || res.data;
      setDevices(Array.isArray(raw) ? raw : raw?.items || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await apiClient.post(`/devices/${id}/test-connection`);
      setTestResult({
        id,
        success: res.data.data.success,
        message: res.data.data.message,
      });
      await fetchDevices();
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Biometric Terminals & Access Hardware
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Manage biometric fingerprint turnstiles, facial scanners, RFID gateways, and cloud push webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={fetchDevices}
          >
            Refresh Hardware
          </Button>
          {canRegister && (
            <Button
              className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none"
              onClick={() => navigate('/devices/new')}
            >
              + Register Biometric Terminal
            </Button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
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
                  <th className="py-2.5 px-4 font-semibold">Terminal Name & Code</th>
                  <th className="py-2.5 px-4 font-semibold">Hardware Type</th>
                  <th className="py-2.5 px-4 font-semibold">Protocol / Connection</th>
                  <th className="py-2.5 px-4 font-semibold">IP Address & Port</th>
                  <th className="py-2.5 px-4 font-semibold">Mapped Athletes</th>
                  <th className="py-2.5 px-4 font-semibold">Telemetry Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                      No access hardware devices registered yet. Click '+ Register Biometric Terminal' above.
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => {
                    const isOnline = dev.status === 'ONLINE';
                    return (
                      <tr key={dev.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0A192F]">
                          <button
                            type="button"
                            className="hover:underline text-left"
                            onClick={() => navigate(`/devices/${dev.id}`)}
                          >
                            {dev.name}
                            <span className="block font-mono text-[11px] text-[#6B7280]">
                              {dev.deviceCode}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-[#0A192F]">
                          {dev.deviceType.replace(/_/g, ' ')}
                          <span className="block text-[11px] text-[#6B7280]">
                            {dev.manufacturer}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                          {dev.connectionType}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#0A192F]">
                          {dev.ipAddress ? `${dev.ipAddress}:${dev.port || 4370}` : 'Cloud Webhook'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {dev._count?.mappings ?? 0} mapped
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              isOnline
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {dev.status}
                          </span>
                          {dev.lastHeartbeat && (
                            <span className="block text-[10px] text-[#6B7280] font-mono mt-0.5">
                              Heartbeat: {new Date(dev.lastHeartbeat).toLocaleTimeString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={testingId === dev.id}
                              className="text-xs border-[#E5E7EB] hover:bg-[#F5F5F0] rounded-none h-7 px-2.5"
                              onClick={() => handleTestConnection(dev.id)}
                            >
                              {testingId === dev.id ? 'Testing...' : 'Ping Test'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-[#E5E7EB] hover:bg-[#0A192F] hover:text-white rounded-none h-7 px-2.5"
                              onClick={() => navigate(`/devices/${dev.id}/mappings`)}
                            >
                              Mappings
                            </Button>
                          </div>
                          {testResult && testResult.id === dev.id && (
                            <div
                              className={`text-[10px] mt-1.5 font-medium ${
                                testResult.success ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {testResult.message}
                            </div>
                          )}
                        </td>
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


