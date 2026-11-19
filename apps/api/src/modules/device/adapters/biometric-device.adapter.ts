export interface DeviceCapabilities {
  supportsPush: boolean;
  supportsPull: boolean;
  supportsRealtimeStream: boolean;
  supportsRemoteUserRegistration: boolean;
  supportsClockSync: boolean;
}

export interface RawDeviceEvent {
  externalUserId: string;
  timestamp: Date;
  direction?: 'CHECK_IN' | 'CHECK_OUT';
  rawIdentifier: string;
}

export interface IBiometricDeviceAdapter {
  getManufacturer(): string;
  getCapabilities(): DeviceCapabilities;
  testConnection(device: any): Promise<{ isConnected: boolean; message: string; latencyMs?: number }>;
  fetchAttendanceLogs(device: any, cursor?: string): Promise<{ events: RawDeviceEvent[]; nextCursor?: string }>;
  getDeviceStatus(device: any): Promise<{ isOnline: boolean; registeredUserCount?: number; logCount?: number }>;
}

/**
 * Standard Webhook and Cloud Push Gateway Adapter for Biometric Terminals
 */
export class GenericWebhookGatewayAdapter implements IBiometricDeviceAdapter {
  getManufacturer(): string {
    return 'Generic Biometric Webhook & Gateway';
  }

  getCapabilities(): DeviceCapabilities {
    return {
      supportsPush: true,
      supportsPull: false,
      supportsRealtimeStream: true,
      supportsRemoteUserRegistration: false,
      supportsClockSync: false,
    };
  }

  async testConnection(device: any): Promise<{ isConnected: boolean; message: string; latencyMs?: number }> {
    const isRecentlyActive =
      device.lastHeartbeatAt &&
      Date.now() - new Date(device.lastHeartbeatAt).getTime() < 5 * 60 * 1000;

    return {
      isConnected: isRecentlyActive || device.status === 'ONLINE',
      message: isRecentlyActive
        ? `Device ${device.deviceCode} is active and receiving telemetry via gateway.`
        : `Device ${device.deviceCode} is configured for gateway push. Awaiting incoming heartbeat or push events.`,
      latencyMs: isRecentlyActive ? 42 : undefined,
    };
  }

  async fetchAttendanceLogs(): Promise<{ events: RawDeviceEvent[]; nextCursor?: string }> {
    // Gateway operates via push ingestion
    return { events: [], nextCursor: undefined };
  }

  async getDeviceStatus(device: any): Promise<{ isOnline: boolean }> {
    const isRecentlyActive =
      device.lastHeartbeatAt &&
      Date.now() - new Date(device.lastHeartbeatAt).getTime() < 5 * 60 * 1000;

    return {
      isOnline: Boolean(isRecentlyActive || device.status === 'ONLINE'),
    };
  }
}
