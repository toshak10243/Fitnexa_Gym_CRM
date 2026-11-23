import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

interface MappingItem {
  id: string;
  deviceUserId: string;
  enrolledAt: string;
  isActive: boolean;
  member: {
    id: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface UnmappedEventItem {
  id: string;
  deviceUserId: string;
  eventTimestamp: string;
  direction: string;
  processingError?: string;
}

export function DeviceMappingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [device, setDevice] = useState<any>(null);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [unmappedEvents, setUnmappedEvents] = useState<UnmappedEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New mapping form state
  const [memberCode, setMemberCode] = useState('');
  const [deviceUserId, setDeviceUserId] = useState('');
  const [isMapping, setIsMapping] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [devRes, mapRes, unmapRes] = await Promise.all([
        apiClient.get(`/devices/${id}`),
        apiClient.get(`/devices/${id}/mappings`),
        apiClient.get(`/devices/${id}/unmapped-events`),
      ]);
      setDevice(devRes.data.data);
      setMappings(mapRes.data.data.items || []);
      setUnmappedEvents(unmapRes.data.data.items || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberCode.trim() || !deviceUserId.trim()) {
      setFeedback({ type: 'error', message: 'Member code and Hardware Device User ID are required.' });
      return;
    }

    setIsMapping(true);
    setFeedback(null);

    try {
      // Resolve member by code
      const mRes = await apiClient.get(`/members?search=${encodeURIComponent(memberCode.trim())}&limit=1`);
      const member = mRes.data.data.items?.[0];
      if (!member) {
        throw new Error(`Member with code '${memberCode}' was not found.`);
      }

      await apiClient.post(`/devices/${id}/mappings`, {
        memberId: member.id,
        deviceUserId: deviceUserId.trim(),
      });

      setFeedback({
        type: 'success',
        message: `Successfully mapped ${member.firstName} ${member.lastName} to Terminal User ID #${deviceUserId}.`,
      });
      setMemberCode('');
      setDeviceUserId('');
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Mapping failed.',
      });
    } finally {
      setIsMapping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
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
            Biometric Hardware Enrollment Mappings
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Terminal: <strong className="text-[#0A192F]">{device?.name}</strong> ({device?.deviceCode})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate(`/devices/${id}`)}
          >
            ← Back to Device Details
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Enroll / Map Form */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-3">
          Enroll Member to Terminal Hardware ID
        </h2>
        <form onSubmit={handleCreateMapping} className="flex flex-col md:flex-row items-end gap-3 text-xs">
          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Member Code
            </label>
            <Input
              required
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. MEM-0001"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs uppercase"
            />
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Hardware Enrollment ID (Slot / Finger ID on Terminal)
            </label>
            <Input
              required
              value={deviceUserId}
              onChange={(e) => setDeviceUserId(e.target.value)}
              placeholder="e.g. 101, 9042"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={isMapping}
            className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs font-bold rounded-none px-6 h-9"
          >
            {isMapping ? 'Saving...' : 'Link Athlete to Device'}
          </Button>
        </form>
      </div>

      {/* Unmapped Hardware Taps Alert Queue */}
      {unmappedEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Unmapped Biometric Taps Queue ({unmappedEvents.length} Pending)
            </h3>
            <span className="text-[10px] text-amber-800 font-semibold uppercase">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            The turnstile reported biometric punches from enrollment IDs not yet linked to any athlete. Select one to quickly map it.
          </p>

          <div className="overflow-x-auto bg-white border border-amber-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900 uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-3 font-semibold">Tap Timestamp</th>
                  <th className="py-2 px-3 font-semibold">Terminal Slot / User ID</th>
                  <th className="py-2 px-3 font-semibold">Direction</th>
                  <th className="py-2 px-3 font-semibold text-right">Quick Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200">
                {unmappedEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-amber-50">
                    <td className="py-2 px-3 font-mono text-[#0A192F]">
                      {new Date(evt.eventTimestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#0A192F]">
                      #{evt.deviceUserId}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#6B7280]">{evt.direction}</td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-none h-6 px-2.5"
                        onClick={() => {
                          setDeviceUserId(evt.deviceUserId);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Use Slot #{evt.deviceUserId} ↑
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mappings Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Active Hardware Mappings ({mappings.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-semibold">Terminal Slot / User ID</th>
                <th className="py-2.5 px-4 font-semibold">Athlete Name</th>
                <th className="py-2.5 px-4 font-semibold">Member Code</th>
                <th className="py-2.5 px-4 font-semibold">Phone</th>
                <th className="py-2.5 px-4 font-semibold">Enrolled At</th>
                <th className="py-2.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    No members mapped to this terminal yet.
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F5F5F0] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                      #{m.deviceUserId}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      <button
                        type="button"
                        className="hover:underline text-left"
                        onClick={() => navigate(`/members/${m.member.id}`)}
                      >
                        {m.member.firstName} {m.member.lastName}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6B7280]">{m.member.memberCode}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{m.member.phone}</td>
                    <td className="py-3 px-4 font-mono text-[#0A192F]">
                      {new Date(m.enrolledAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


