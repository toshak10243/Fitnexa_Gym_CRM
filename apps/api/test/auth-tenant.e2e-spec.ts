import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 1 E2E Integration Suite', () => {
  let app: INestApplication;
  let accessToken: string;
  const uniqueSuffix = Date.now();
  const testEmail = `owner_${uniqueSuffix}@fitnexa-test.in`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Owner Onboarding & Authentication Flow', () => {
    it('POST /api/v1/auth/register-owner - should onboard gym and owner', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register-owner')
        .send({
          gymName: `Olympus Fitness ${uniqueSuffix}`,
          ownerName: 'Devansh Roy',
          email: testEmail,
          phone: '9876543210',
          password: 'Password@2026',
          city: 'Mumbai',
          state: 'Maharashtra',
          address: 'Andheri West Link Road',
          pincode: '400053',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.role).toBe('GYM_OWNER');
      accessToken = res.body.data.accessToken;
    });

    it('POST /api/v1/auth/login - should authenticate with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Password@2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('GYM_OWNER');
    });

    it('GET /api/v1/auth/me - should return authenticated profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.tenant.name).toContain('Olympus Fitness');
    });

    it('GET /api/v1/auth/me - should reject unauthenticated request with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Gym Settings & Branch Management', () => {
    let createdBranchId: string;

    it('GET /api/v1/tenant/profile - should retrieve gym profile and default branch', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.branches.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.branches[0].isMainBranch).toBe(true);
    });

    it('POST /api/v1/tenant/branches - should create additional facility branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/branches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bandra Branch',
          code: `BND-${uniqueSuffix.toString().slice(-4)}`,
          address: 'Hill Road, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          phone: '9876543212',
          isMainBranch: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Bandra Branch');
      createdBranchId = res.body.data.id;
    });

    it('PATCH /api/v1/tenant/branches/:id - should update branch info', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tenant/branches/${createdBranchId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bandra West Elite Facility',
          code: `BND-${uniqueSuffix.toString().slice(-4)}`,
          address: 'Hill Road, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          phone: '9876543212',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Bandra West Elite Facility');
    });
  });

  describe('3. Staff Management & RBAC', () => {
    it('POST /api/v1/staff - should create staff member', async () => {
      const staffEmail = `trainer_${uniqueSuffix}@fitnexa-test.in`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: 'Rajesh Sharma',
          email: staffEmail,
          phone: '9876543222',
          password: 'TrainerPass@123',
          role: 'TRAINER',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fullName).toBe('Rajesh Sharma');
      expect(res.body.data.role).toBe('TRAINER');
    });

    it('GET /api/v1/staff - should return paginated staff list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Audit Trail Verification', () => {
    it('GET /api/v1/audit-logs - should show logged owner onboarding and branch actions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      const actions = res.body.data.items.map((i: any) => i.action);
      expect(actions).toContain('TENANT_ONBOARDED');
    });
  });
});
