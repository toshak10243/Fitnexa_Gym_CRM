import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface BranchOption {
  id: string;
  name: string;
}

export function DeviceCreatePage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  // Form State
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceType, setDeviceType] = useState('BIOMETRIC_FINGERPRINT');
  const [manufacturer, setManufacturer] = useState('ZKTeco');
  const [connectionType, setConnectionType] = useState('CLOUD_PUSH_HTTP');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('4370');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success State with generated secret token
  const [createdSecretToken, setCreatedSecretToken] = useState<string | null>(null);
  const [createdDeviceCode, setCreatedDeviceCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const res = await apiClient.get('/tenant/branches');
        const list = res.data.data || [];
        setBranches(list);
        if (list.length > 0) {
          setBranchId(list[0].id);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !name.trim() || !deviceCode.trim()) {
      setError('Branch, Device Name, and Unique Device Code are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        branchId,
        name: name.trim(),
        deviceCode: deviceCode.trim().toUpperCase(),
        deviceType,
        manufacturer: manufacturer.trim(),
        connectionType,
      };

      if (ipAddress.trim()) {
        payload.ipAddress = ipAddress.trim();
        payload.port = Number(port) || 4370;
      }

      const res = await apiClient.post('/devices', payload);
      const data = res.data.data;
      setCreatedSecretToken(data.assignedSecretToken);
      setCreatedDeviceCode(data.deviceCode);
    } catch (err: any) {
      setError(err.message || 'Failed to register terminal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Register Biometric Terminal / Gate
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Provision a new access control turnstile, facial scanner, or fingerprint enrollment unit.
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
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Secret Token Revelation Display */}
      {createdSecretToken ? (
        <div className="bg-[#FBFBF9] border border-[#0A192F] p-6 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm uppercase">
            <span>✓ Terminal Successfully Registered</span>
          </div>

          <div className="p-4 bg-white border border-[#E5E7EB] space-y-3">
            <div className="text-xs text-[#0A192F] font-semibold">
              Assigned Hardware Webhook Secret Token (x-device-token)
            </div>
            <div className="font-mono text-sm bg-[#0A192F] text-emerald-400 p-3 select-all break-all">
              {createdSecretToken}
            </div>
            <div className="text-[11px] text-red-700 font-semibold">
              Warning: Copy this token now. For cryptographic safety, Fitnexa hashes this token and will not display it in plaintext again.
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E5E7EB] space-y-2 text-xs text-[#6B7280]">
            <div className="font-bold text-[#0A192F] uppercase text-[10px]">
              Hardware Push Webhook Configuration URL:
            </div>
            <div className="font-mono text-[11px] bg-[#F5F5F0] p-2 text-[#0A192F] select-all">
              POST /api/v1/devices/ingest/{createdDeviceCode}
            </div>
            <p>
              Configure your ZKTeco ADMS, eSSL Push Server, or local IoT Gateway with this endpoint and include the secret token in the <code className="font-mono text-[#0A192F]">x-device-token</code> header.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-6"
              onClick={() => navigate('/devices')}
            >
              Done & Return to Terminals
            </Button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Branch */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Assigned Branch *
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
              >
                {isLoadingBranches ? (
                  <option>Loading branches...</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Terminal Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Terminal Display Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Ingress Turnstile #1"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
              />
            </div>

            {/* Unique Device Code */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Unique Device Code (Hardware Identifier) *
              </label>
              <Input
                required
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                placeholder="e.g. BIO-MUM-01"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono uppercase"
              />
              <p className="text-[10px] text-[#6B7280] mt-1">
                Must be unique across your organization.
              </p>
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Hardware Device Type
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
              >
                <option value="BIOMETRIC_FINGERPRINT">BIOMETRIC FINGERPRINT TURNSTILE</option>
                <option value="FACIAL_RECOGNITION">FACIAL RECOGNITION TERMINAL</option>
                <option value="RFID_CARD_READER">RFID CARD READER</option>
                <option value="BARCODE_QR_SCANNER">BARCODE / QR CODE SCANNER</option>
                <option value="MANUAL_GATEWAY">MANUAL RECEPTION GATEWAY</option>
              </select>
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Hardware Manufacturer / Model
              </label>
              <Input
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. ZKTeco SilkBio-101TC / eSSL K30 Pro"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
              />
            </div>

            {/* Connection Protocol */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Connection Protocol
              </label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F]"
              >
                <option value="CLOUD_PUSH_HTTP">CLOUD PUSH HTTP (ADMS / Webhook)</option>
                <option value="LAN_TCP_IP">LOCAL LAN TCP/IP POLLING</option>
                <option value="SERIAL_RS485">SERIAL RS485 / COM PORT</option>
                <option value="USB_DIRECT">USB DIRECT ATTACH</option>
              </select>
            </div>

            {/* Local IP Address (Optional) */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Local IP Address (Optional for LAN Polling)
              </label>
              <Input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 192.168.1.201"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                Hardware Port (Default 4370)
              </label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="outline"
              className="text-xs border-[#E5E7EB] rounded-none"
              onClick={() => navigate('/devices')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs font-bold rounded-none px-6"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Terminal'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
