import {
  DeviceType,
  DeviceConnectionType,
  DeviceDirection,
  DeviceStatus,
  AttendanceDirection,
} from '../constants/index';

export interface RegisterDeviceDto {
  branchId: string;
  name: string;
  deviceCode: string;
  deviceType: DeviceType;
  manufacturer?: string;
  modelName?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  port?: number;
  connectionType?: DeviceConnectionType;
  direction?: DeviceDirection;
  authToken?: string;
  notes?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  status?: DeviceStatus;
  ipAddress?: string;
  port?: number;
  connectionType?: DeviceConnectionType;
  direction?: DeviceDirection;
  notes?: string;
}

export interface MapDeviceMemberDto {
  memberId: string;
  deviceUserId: string;
}

export interface DeviceIngestEventDto {
  deviceUserId: string;
  timestamp: string;
  direction?: AttendanceDirection;
  idempotencyKey?: string;
  rawPayload?: Record<string, unknown>;
}

export interface DeviceIngestWebhookPayload {
  events: DeviceIngestEventDto[];
}
