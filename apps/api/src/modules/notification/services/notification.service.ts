import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { QUEUE_NAMES } from '../../../jobs/bullmq.module';
import {
  SendNotificationDto,
  UpsertNotificationPreferenceDto,
} from '../dto/notification.dto';
import { NotificationStatus } from '@fitnexa/shared';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  // --------------------------------------------------------------------------
  // Dispatch Notification (BullMQ Background Worker)
  // --------------------------------------------------------------------------

  async dispatchNotification(tenantId: string, dto: SendNotificationDto) {
    const recipientType = dto.recipientType || 'STAFF';
    const recipientId = dto.recipientId || 'TENANT_BROADCAST';
    const idempotencyKey =
      dto.idempotencyKey ||
      randomUUID();

    // 1. Check if identical notification was already queued/sent today
    const existing = await this.prisma.notification.findFirst({
      where: { tenantId, idempotencyKey },
    });
    if (existing) {
      return existing; // Idempotently skip duplicate dispatch
    }

    // 2. Persist in database
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        recipientType,
        recipientId,
        type: dto.type,
        channel: dto.channel || 'IN_APP',
        title: dto.title.trim(),
        message: dto.message.trim(),
        status: NotificationStatus.QUEUED,
        idempotencyKey,
        metadata: dto.metadata || {},
      },
    });

    // 3. Enqueue BullMQ Job with deduplication ID
    try {
      await this.notificationQueue.add(
        'send_notification',
        {
          notificationId: notification.id,
          tenantId,
          channel: notification.channel,
          recipientType: notification.recipientType,
          recipientId: notification.recipientId,
          title: notification.title,
          message: notification.message,
        },
        {
          jobId: `notif-${notification.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    } catch {
      // In local environments where Redis < 5.0, immediately mark notification as SENT for in-app delivery
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: notification.channel === 'IN_APP' ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: notification.channel === 'IN_APP' ? new Date() : null,
        },
      });
    }

    return notification;
  }

  // --------------------------------------------------------------------------
  // In-App Feed & Reading
  // --------------------------------------------------------------------------

  async getFeed(tenantId: string, recipientId: string, limit = 20) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenantId, recipientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { tenantId, recipientId, status: { not: NotificationStatus.READ } },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(tenantId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(tenantId: string, recipientId: string) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId,
        recipientId,
        status: { not: NotificationStatus.READ },
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { success: true, message: 'All notifications marked as read.' };
  }

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  async getPreferences(tenantId: string, userId?: string, memberId?: string) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (memberId) where.memberId = memberId;

    let pref = await this.prisma.notificationPreference.findFirst({ where });
    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: {
          tenantId,
          userId,
          memberId,
          optOutSms: false,
          optOutEmail: false,
          optOutWhatsApp: false,
        },
      });
    }
    return pref;
  }

  async updatePreferences(
    tenantId: string,
    dto: UpsertNotificationPreferenceDto,
    userId?: string,
    memberId?: string,
  ) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (memberId) where.memberId = memberId;

    let pref = await this.prisma.notificationPreference.findFirst({ where });
    if (!pref) {
      return this.prisma.notificationPreference.create({
        data: {
          tenantId,
          userId,
          memberId,
          optOutSms: dto.optOutSms ?? false,
          optOutEmail: dto.optOutEmail ?? false,
          optOutWhatsApp: dto.optOutWhatsApp ?? false,
        },
      });
    }

    return this.prisma.notificationPreference.update({
      where: { id: pref.id },
      data: {
        optOutSms: dto.optOutSms,
        optOutEmail: dto.optOutEmail,
        optOutWhatsApp: dto.optOutWhatsApp,
      },
    });
  }
}
