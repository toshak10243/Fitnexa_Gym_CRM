import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = {
    getHealth: jest.fn().mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 10,
      environment: 'test',
      version: '0.1.0',
      services: {
        database: { status: 'up', responseTimeMs: 2 },
        redis: { status: 'up', responseTimeMs: 1 },
        memory: { heapUsedMb: 50, rssMb: 100 },
      },
    }),
    getLiveness: jest.fn().mockResolvedValue({ status: 'ok' }),
    getReadiness: jest.fn().mockResolvedValue({ status: 'ok', database: 'up' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.services.database.status).toBe('up');
  });

  it('should return liveness', async () => {
    const res = await controller.liveness();
    expect(res.status).toBe('ok');
  });

  it('should return readiness', async () => {
    const res = await controller.readiness();
    expect(res.status).toBe('ok');
    expect(res.database).toBe('up');
  });
});
