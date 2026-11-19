import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from '../../modules/redis/redis.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let mockReflector: Partial<Reflector>;
  let mockRedisClient: any;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ limit: 3, ttlSeconds: 60 }),
    };

    mockRedisClient = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn().mockResolvedValue(45),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  const createMockContext = (ip = '192.168.1.1', path = '/api/v1/auth/login'): any => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        ip,
        url: path,
        route: { path },
        socket: { remoteAddress: ip },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  it('should allow requests within limit', async () => {
    mockRedisClient.incr.mockResolvedValueOnce(1);

    const context = createMockContext();
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRedisClient.expire).toHaveBeenCalledWith(
      'fitnexa:ratelimit:192.168.1.1:/api/v1/auth/login',
      60,
    );
  });

  it('should throw 429 TooManyRequests when limit is exceeded', async () => {
    mockRedisClient.incr.mockResolvedValueOnce(4); // limit is 3

    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
