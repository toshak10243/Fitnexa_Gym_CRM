import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('test-mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'jwt.secret') return 'test-secret-min-32-chars-long-2026';
      if (key === 'jwt.refreshSecret') return 'test-refresh-secret-min-32-chars';
      return null;
    }),
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerOwner', () => {
    it('should throw ConflictException if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing-id' });

      await expect(
        service.registerOwner(
          {
            gymName: 'Test Gym',
            ownerName: 'Test Owner',
            email: 'test@gym.com',
            phone: '9876543210',
            password: 'Password@123',
            city: 'Delhi',
            state: 'Delhi',
            address: '123 Test St',
            pincode: '110001',
          },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new gym owner and audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockResolvedValueOnce({
        tenant: {
          id: 'tenant-1',
          name: 'Fit Gym',
          slug: 'fit-gym-1234',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          city: 'Delhi',
          state: 'Delhi',
        },
        branch: { id: 'branch-1', name: 'Main' },
        user: {
          id: 'user-1',
          email: 'owner@fitgym.com',
          fullName: 'Owner',
          phone: '9876543210',
          role: 'GYM_OWNER',
          status: 'ACTIVE',
        },
      });
      mockPrisma.user.update.mockResolvedValueOnce({});

      const result = await service.registerOwner(
        {
          gymName: 'Fit Gym',
          ownerName: 'Owner',
          email: 'owner@fitgym.com',
          phone: '9876543210',
          password: 'Password@123',
          city: 'Delhi',
          state: 'Delhi',
          address: '123 St',
          pincode: '110001',
        },
        '127.0.0.1',
        'test-agent',
      );

      expect(result.accessToken).toBe('test-mock-token');
      expect(result.user.role).toBe('GYM_OWNER');
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_ONBOARDED',
        }),
      );
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login(
          { email: 'unknown@gym.com', password: 'Password@123' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass@123', 10);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        email: 'user@gym.com',
        passwordHash,
        status: 'ACTIVE',
        tenant: { id: 't-1' },
      });

      await expect(
        service.login(
          { email: 'user@gym.com', password: 'WrongPassword@123' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
