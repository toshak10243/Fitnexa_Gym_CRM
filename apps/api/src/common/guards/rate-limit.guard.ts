import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../modules/redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimit = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Default rate limit if not explicitly decorated: 100 requests per minute
    const limit = rateLimit?.limit ?? 100;
    const ttlSeconds = rateLimit?.ttlSeconds ?? 60;

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown-ip';

    const path = request.route?.path || request.url;
    const redisClient = this.redisService.getClient();

    if (!this.redisService.isReady() || !redisClient) {
      // In development or if Redis is temporarily unreachable, allow request but log warning
      return true;
    }

    const key = `fitnexa:ratelimit:${clientIp}:${path}`;

    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, ttlSeconds);
      }

      if (current > limit) {
        const ttl = await redisClient.ttl(key);
        this.logger.warn(
          `Rate limit exceeded for IP: ${clientIp} on path: ${path} (Attempt: ${current}/${limit})`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'TooManyRequests',
            message: `Rate limit of ${limit} requests per ${ttlSeconds} seconds exceeded. Try again in ${ttl > 0 ? ttl : ttlSeconds} seconds.`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.warn(`Rate limiter Redis check failed: ${(error as Error).message}`);
      return true; // fail-open on transient Redis errors so legitimate traffic isn't blocked
    }
  }
}
