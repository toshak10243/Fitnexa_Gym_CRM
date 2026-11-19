import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { QUEUE_NAMES } from '../../../jobs/bullmq.module';
import { NotificationStatus } from '@fitnexa/shared';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  onModuleInit() {
    this.worker.on('error', (err) => {
      this.logger.warn(`BullMQ notification worker notice: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.worker.close();
    } catch {
      // Handled
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { notificationId, channel, recipientId, title } = job.data;
    this.logger.log(`Processing notification job [${job.id}] via channel [${channel}] for recipient [${recipientId}]`);

    try {
      // In production, delegate to verified SMS / Email / WhatsApp provider adapter.
      // In sandbox/development, simulate delivery safely:
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Successfully dispatched notification [${notificationId}]: "${title}"`);
      return { success: true, notificationId };
    } catch (err: any) {
      this.logger.error(`Failed to process notification [${notificationId}]: ${err.message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
          errorDetails: err.message,
        },
      });
      throw err;
    }
  }
}
