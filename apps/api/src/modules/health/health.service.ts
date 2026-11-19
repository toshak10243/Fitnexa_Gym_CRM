import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthCheckResponse } from '@fitnexa/shared';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<HealthCheckResponse> {
    const dbHealth = await this.prisma.checkHealth();
    const redisHealth = await this.redis.checkHealth();
    const memUsage = process.memoryUsage();

    const isHealthy = dbHealth.status === 'up';
    const isDegraded = isHealthy && redisHealth.status === 'down';

    return {
      status: !isHealthy ? 'error' : isDegraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      version: '0.1.0',
      services: {
        database: {
          status: dbHealth.status,
          responseTimeMs: dbHealth.latencyMs,
          error: dbHealth.error,
        },
        redis: {
          status: redisHealth.status,
          responseTimeMs: redisHealth.latencyMs,
          error: redisHealth.error,
        },
        memory: {
          heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
        },
      },
    };
  }

  async getLiveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<{ status: string; database: string }> {
    const dbHealth = await this.prisma.checkHealth();
    return {
      status: dbHealth.status === 'up' ? 'ok' : 'degraded',
      database: dbHealth.status,
    };
  }
}
