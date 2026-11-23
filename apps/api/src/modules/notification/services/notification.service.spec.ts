import { NotificationService } from './notification.service';
import { PrismaService } from '../../../database/prisma.service';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationType } from '@fitnexa/shared';

describe('Notification dispatch reliability', () => {
  const prisma = { notification: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } };
  const queue = { add: jest.fn() };
  const service = new NotificationService(prisma as unknown as PrismaService, queue as unknown as Queue);
  const dto = { type: 'GENERAL_ANNOUNCEMENT' as NotificationType, title: 'Holiday hours', message: 'Opening times updated', channel: NotificationChannel.IN_APP };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockImplementation(({data}) => Promise.resolve({id:'notification-id', ...data}));
    queue.add.mockResolvedValue({});
  });
  it('allows two independent announcements on the same day', async () => {
    await service.dispatchNotification('tenant', dto);
    await service.dispatchNotification('tenant', dto);
    const keys = prisma.notification.create.mock.calls.map(([arg]) => arg.data.idempotencyKey);
    expect(keys[0]).not.toBe(keys[1]);
    expect(queue.add.mock.calls[0][2].jobId).toBe('notif-notification-id');
  });
  it('does not claim an email was delivered when enqueue fails', async () => {
    queue.add.mockRejectedValue(new Error('Queue unavailable'));
    await service.dispatchNotification('tenant', {...dto, channel: NotificationChannel.EMAIL});
    expect(prisma.notification.update).toHaveBeenCalledWith({where:{id:'notification-id'},data:{status:'FAILED',sentAt:null}});
  });
});
