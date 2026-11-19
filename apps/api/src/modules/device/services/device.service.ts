import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { MapDeviceMemberDto } from '../dto/map-member.dto';
import { GenericWebhookGatewayAdapter } from '../adapters/biometric-device.adapter';
import { DeviceStatus } from '@fitnexa/shared';
import * as crypto from 'crypto';

@Injectable()
export class DeviceService {
  private readonly adapter = new GenericWebhookGatewayAdapter();

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: RegisterDeviceDto) {
    const existing = await this.prisma.device.findFirst({
      where: { tenantId, deviceCode: dto.deviceCode },
    });

    if (existing) {
      throw new ConflictException(`Device with code '${dto.deviceCode}' already registered in tenant.`);
    }

    // Hash auth token if provided, else generate random secret
    const rawToken = dto.authToken || crypto.randomBytes(16).toString('hex');
    const authTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const device = await this.prisma.device.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        name: dto.name,
        deviceCode: dto.deviceCode,
        deviceType: dto.deviceType,
        manufacturer: dto.manufacturer || 'Generic / Pending Verification',
        modelName: dto.modelName || 'Pending Model Spec',
        serialNumber: dto.serialNumber,
        firmwareVersion: dto.firmwareVersion,
        ipAddress: dto.ipAddress,
        port: dto.port,
        connectionType: dto.connectionType,
        direction: dto.direction,
        status: DeviceStatus.ONLINE,
        authTokenHash,
        notes: dto.notes,
        lastHeartbeatAt: new Date(),
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    return {
      ...device,
      assignedSecretToken: rawToken, // Returned once upon registration
    };
  }

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    return this.prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            memberMappings: true,
            eventsInbox: true,
          },
        },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            memberMappings: true,
            eventsInbox: true,
          },
        },
      },
    });

    if (!device) throw new NotFoundException('Device not found.');
    return device;
  }

  async update(tenantId: string, id: string, dto: UpdateDeviceDto) {
    await this.findById(tenantId, id);

    const data: any = { ...dto };
    if (dto.authToken) {
      data.authTokenHash = crypto.createHash('sha256').update(dto.authToken).digest('hex');
      delete data.authToken;
    }

    return this.prisma.device.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async testConnection(tenantId: string, id: string) {
    const device = await this.findById(tenantId, id);
    const result = await this.adapter.testConnection(device);

    if (result.isConnected) {
      await this.prisma.device.update({
        where: { id },
        data: { status: DeviceStatus.ONLINE, lastHeartbeatAt: new Date() },
      });
    }

    return result;
  }

  /**
   * Member biometric hardware mapping
   */
  async mapMember(tenantId: string, deviceId: string, dto: MapDeviceMemberDto) {
    const device = await this.findById(tenantId, deviceId);

    // Verify member exists in tenant
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, tenantId },
    });
    if (!member) throw new NotFoundException('Member not found in tenant.');

    // Upsert mapping
    return this.prisma.deviceMemberMapping.upsert({
      where: {
        deviceId_deviceUserId: {
          deviceId,
          deviceUserId: dto.deviceUserId,
        },
      },
      create: {
        tenantId,
        branchId: device.branchId,
        deviceId,
        memberId: dto.memberId,
        deviceUserId: dto.deviceUserId,
        isActive: true,
        syncedAt: new Date(),
      },
      update: {
        memberId: dto.memberId,
        isActive: true,
        syncedAt: new Date(),
      },
      include: {
        member: { select: { id: true, fullName: true, memberCode: true, phone: true } },
      },
    });
  }

  async unmapMember(tenantId: string, deviceId: string, mappingId: string) {
    await this.findById(tenantId, deviceId);
    return this.prisma.deviceMemberMapping.delete({
      where: { id: mappingId },
    });
  }

  async getMappings(tenantId: string, deviceId: string) {
    await this.findById(tenantId, deviceId);
    return this.prisma.deviceMemberMapping.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { id: true, fullName: true, memberCode: true, phone: true, photoUrl: true } },
      },
    });
  }

  async getUnmappedEvents(tenantId: string, deviceId?: string) {
    const where: any = {
      tenantId,
      ingestionStatus: 'UNMAPPED_USER',
    };
    if (deviceId) where.deviceId = deviceId;

    return this.prisma.deviceEventInbox.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 50,
      include: {
        device: { select: { id: true, name: true, deviceCode: true } },
      },
    });
  }
}
