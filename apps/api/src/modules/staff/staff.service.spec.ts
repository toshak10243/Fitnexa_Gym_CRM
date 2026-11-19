import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@fitnexa/shared';

describe('StaffService', () => {
  let service: StaffService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
    },
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should prevent creating staff with existing email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'exists' });

    await expect(
      service.createStaff(
        'tenant-1',
        'creator-1',
        {
          fullName: 'Trainer John',
          email: 'john@gym.com',
          phone: '9876543210',
          password: 'Pass@123',
          role: UserRole.TRAINER,
        },
        '127.0.0.1',
        'ua',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent updating staff belonging to another tenant (IDOR)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.updateStaff(
        'tenant-1',
        'foreign-staff-id',
        'owner-1',
        { fullName: 'Hacker Attempt' },
        '127.0.0.1',
        'ua',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject demoting Gym Owner', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: 'owner-id',
      tenantId: 'tenant-1',
      role: UserRole.GYM_OWNER,
    });

    await expect(
      service.updateStaff(
        'tenant-1',
        'owner-id',
        'owner-id',
        { role: UserRole.TRAINER },
        '127.0.0.1',
        'ua',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
