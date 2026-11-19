import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db', 0);

    try {
      this.client = new Redis({
        host,
        port,
        password,
        db,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop reconnecting after 3 attempts if down
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis connected on ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt async connection without blocking app boot
      this.client.connect().catch((err) => {
        this.logger.warn(`Redis initial connection skipped or offline: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis client initialization failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Enterprise key naming standard: fitnexa:{tenantId}:{module}:{identifier}
   */
  buildKey(tenantId: string, module: string, identifier: string): string {
    return `fitnexa:${tenantId}:${module}:${identifier}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache get failed for key "${key}": ${(error as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache set failed for key "${key}": ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache del failed for key "${key}": ${(error as Error).message}`);
    }
  }

  async checkHealth(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    if (!this.client) {
      return { status: 'down', error: 'Redis client not initialized' };
    }
    const start = Date.now();
    try {
      const res = await this.client.ping();
      return {
        status: res === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        status: 'down',
        error: err?.message || 'Redis connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }
}
