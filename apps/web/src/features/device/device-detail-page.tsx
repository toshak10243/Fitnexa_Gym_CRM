import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDevice = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/devices/${id}`);
      setDevice(res.data.data);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevice();
  }, [id]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post(`/devices/${id}/test-connection`);
      setTestResult({
        success: res.data.data.success,
        message: res.data.data.message,
      });
      await fetchDevice();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20 text-xs text-[#6B7280]">
        Terminal device not found.
      </div>
    );
  }

  const isOnline = device.status === 'ONLINE';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              {device.name}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {device.status}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-mono mt-1">
            Hardware Code: {device.deviceCode} | Branch: {device.branch?.name || 'Main Facility'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/devices')}
          >
            ← Back to Directory
          </Button>
          <Button
            variant="outline"
            disabled={isTesting}
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={handleTestConnection}
          >
            {isTesting ? 'Testing Hardware...' : 'Ping Test'}
          </Button>
          <Button
            className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate(`/devices/${device.id}/mappings`)}
          >
            Manage Athlete Mappings ({device._count?.mappings || 0})
          </Button>
        </div>
      </div>

      {testResult && (
        <div
          className={`p-3 border text-xs font-medium ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {testResult.message}
        </div>
      )}

      {/* Hardware Telemetry Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            Terminal Specifications
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Device Type:</span>
              <strong className="text-[#0A192F]">{device.deviceType.replace(/_/g, ' ')}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Manufacturer / Model:</span>
              <span className="text-[#0A192F]">{device.manufacturer}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Connection Protocol:</span>
              <span className="font-mono text-[#0A192F]">{device.connectionType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">IP Address & Port:</span>
              <span className="font-mono text-[#0A192F]">
                {device.ipAddress ? `${device.ipAddress}:${device.port || 4370}` : 'Cloud Webhook'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Last Heartbeat:</span>
              <span className="font-mono text-[#0A192F]">
                {device.lastHeartbeat
                  ? new Date(device.lastHeartbeat).toLocaleString('en-IN')
                  : 'No heartbeat received yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            Cloud Webhook & Ingestion Integration
          </h2>
          <div className="space-y-3 text-xs">
            <p className="text-[#6B7280]">
              To stream real-time gate tap events from your physical hardware or gateway to Fitnexa, post JSON payloads to:
            </p>
            <div className="font-mono text-[11px] bg-white border border-[#E5E7EB] p-2.5 text-[#0A192F] select-all">
              POST /api/v1/devices/ingest/{device.deviceCode}
            </div>
            <div className="bg-white border border-[#E5E7EB] p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#6B7280]">Required HTTP Header:</span>
              <div className="font-mono text-[11px] text-[#0A192F]">
                x-device-token: &lt;assigned-secret-token&gt;
              </div>
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Payload requires <code className="font-mono text-[#0A192F]">events: [&#123; deviceUserId, timestamp, direction &#125;]</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
