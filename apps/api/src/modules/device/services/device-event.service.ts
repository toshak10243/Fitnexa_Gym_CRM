import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { DeviceIngestWebhookDto } from '../dto/device-ingest.dto';
import {
  AttendanceDirection,
  AttendanceSourceType,
  EventIngestionStatus,
  AccessDecisionType,
  AccessReasonCode,
} from '@fitnexa/shared';
import * as crypto from 'crypto';

@Injectable()
export class DeviceEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Secure ingestion endpoint for biometric machines / gateways
   */
  async ingestFromDevice(
    deviceCode: string,
    rawAuthToken: string | undefined,
    dto: DeviceIngestWebhookDto,
  ) {
    // 1. Locate device by code
    const device = await this.prisma.device.findFirst({
      where: { deviceCode },
    });

    if (!device) {
      throw new NotFoundException(`Device with code '${deviceCode}' not found.`);
    }

    // 2. Validate authentication token if configured
    if (device.authTokenHash) {
      if (!rawAuthToken) {
        throw new UnauthorizedException('Device authentication token is required.');
      }
      const hashedProvided = crypto.createHash('sha256').update(rawAuthToken).digest('hex');
      if (hashedProvided !== device.authTokenHash) {
        throw new UnauthorizedException('Invalid device authentication token.');
      }
    }

    // Update device heartbeat
    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastHeartbeatAt: new Date(), status: 'ONLINE' },
    });

    const results = [];

    // 3. Process events transactionally & idempotently
    for (const evt of dto.events) {
      const eventDate = new Date(evt.timestamp);
      const direction = evt.direction || AttendanceDirection.CHECK_IN;

      const idempotencyKey =
        evt.idempotencyKey ||
        crypto
          .createHash('sha256')
          .update(`${device.id}:${evt.deviceUserId}:${eventDate.toISOString()}:${direction}`)
          .digest('hex');

      // Check if duplicate in inbox
      const existing = await this.prisma.deviceEventInbox.findFirst({
        where: { tenantId: device.tenantId, idempotencyKey },
      });

      if (existing) {
        results.push({
          idempotencyKey,
          status: EventIngestionStatus.DUPLICATE,
          message: 'Duplicate event already ingested.',
        });
        continue;
      }

      // Record in durable inbox
      const inboxRecord = await this.prisma.deviceEventInbox.create({
        data: {
          tenantId: device.tenantId,
          branchId: device.branchId,
          deviceId: device.id,
          idempotencyKey,
          deviceUserId: evt.deviceUserId,
          eventTimestamp: eventDate,
          direction,
          rawPayload: evt.rawPayload || (evt as any),
          ingestionStatus: EventIngestionStatus.PENDING,
        },
      });

      // 4. Resolve Member via DeviceMemberMapping
      const mapping = await this.prisma.deviceMemberMapping.findFirst({
        where: {
          deviceId: device.id,
          deviceUserId: evt.deviceUserId,
          isActive: true,
        },
      });

      if (!mapping) {
        // Unmapped event: mark as UNMAPPED_USER and log access denial
        await this.prisma.deviceEventInbox.update({
          where: { id: inboxRecord.id },
          data: {
            ingestionStatus: EventIngestionStatus.UNMAPPED_USER,
            processingError: `No active member mapping found for device user ID: ${evt.deviceUserId}`,
            processedAt: new Date(),
          },
        });

        await this.prisma.accessDecision.create({
          data: {
            tenantId: device.tenantId,
            branchId: device.branchId,
            deviceId: device.id,
            decision: AccessDecisionType.DENIED,
            reasonCode: AccessReasonCode.UNMAPPED_DEVICE_USER,
            reasonDetails: `Biometric terminal read unmapped enrollment ID: ${evt.deviceUserId}.`,
          },
        });

        results.push({
          idempotencyKey,
          status: EventIngestionStatus.UNMAPPED_USER,
          message: 'Hardware user ID is not mapped to any member.',
        });
        continue;
      }

      // 5. Execute attendance check-in or checkout
      try {
        if (direction === AttendanceDirection.CHECK_OUT) {
          await this.attendanceService.checkOut(device.tenantId, undefined, {
            memberId: mapping.memberId,
            branchId: device.branchId,
            deviceId: device.id,
            source: AttendanceSourceType.BIOMETRIC_DEVICE,
          });
        } else {
          await this.attendanceService.checkIn(device.tenantId, undefined, undefined, {
            memberId: mapping.memberId,
            branchId: device.branchId,
            deviceId: device.id,
            source: AttendanceSourceType.BIOMETRIC_DEVICE,
          });
        }

        await this.prisma.deviceEventInbox.update({
          where: { id: inboxRecord.id },
          data: {
            ingestionStatus: EventIngestionStatus.PROCESSED,
            processedAt: new Date(),
          },
        });

        results.push({
          idempotencyKey,
          status: EventIngestionStatus.PROCESSED,
          memberId: mapping.memberId,
        });
      } catch (err: any) {
        const errorMsg = err.message || 'Attendance processing failed';
        await this.prisma.deviceEventInbox.update({
          where: { id: inboxRecord.id },
          data: {
            ingestionStatus: EventIngestionStatus.FAILED,
            processingError: errorMsg,
            processedAt: new Date(),
          },
        });

        results.push({
          idempotencyKey,
          status: EventIngestionStatus.FAILED,
          error: errorMsg,
        });
      }
    }

    return {
      deviceCode: device.deviceCode,
      ingestedCount: dto.events.length,
      results,
    };
  }
}
