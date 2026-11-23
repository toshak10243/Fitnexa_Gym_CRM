import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('Dashboard value accuracy', () => {
  const models=['member','memberMembership','memberAttendance','attendanceSession','staffAttendance','invoice','payment','refund','expense','product','lead','trainingSession','stockMovement'];
  const prisma=Object.fromEntries(models.map(name=>[name,{count:jest.fn().mockResolvedValue(0),findMany:jest.fn().mockResolvedValue([]),aggregate:jest.fn().mockResolvedValue({_sum:{}})}]));
  const service=new DashboardService(prisma as unknown as PrismaService,{get:jest.fn().mockResolvedValue(null),set:jest.fn()} as unknown as RedisService);
  it('calculates peak attendance from recorded IST check-ins rather than a fixed time', async () => {
    prisma.memberAttendance.findMany.mockResolvedValue([{timestamp:new Date('2026-11-24T12:30:00Z')},{timestamp:new Date('2026-11-24T12:45:00Z')},{timestamp:new Date('2026-11-24T03:00:00Z')}]);
    const metrics=await service.getExecutiveDashboard('tenant','branch');
    expect(metrics.attendance.todayCheckIns).toBe(3);
    expect(metrics.attendance.peakHour).toBe('18:00 - 19:00');
    expect(prisma.payment.aggregate.mock.calls[0][0].where).toHaveProperty('paymentDate');
    expect(prisma.expense.aggregate.mock.calls[0][0].where).toHaveProperty('expenseDate');
    expect(prisma.invoice.aggregate.mock.calls[1][0].where.invoiceNumber).toEqual({startsWith:'INV-POS'});
  });
});
