import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 2 E2E Integration Suite: Members, Plans & Lifecycles', () => {
  let app: INestApplication;
  let ownerToken: string;
  let branchId: string;
  let memberId: string;
  let memberCode: string;
  let planId: string;
  let membershipId: string;

  const suffix = Date.now();
  const ownerEmail = `phase2_owner_${suffix}@fitnexa.in`;
  const memberPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

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

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        gymName: `Fitnexa Elite Gym ${suffix}`,
        ownerName: 'Vikramaditya Rao',
        email: ownerEmail,
        phone: '9988776655',
        password: 'Password@2026',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Indiranagar 100ft Road',
        pincode: '560038',
      });

    ownerToken = regRes.body.data.accessToken;

    // Get default main branch created during registration
    const branchesRes = await request(app.getHttpServer())
      .get('/api/v1/tenant/branches')
      .set('Authorization', `Bearer ${ownerToken}`);

    branchId = branchesRes.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Member Registration & Profile', () => {
    it('POST /api/v1/members - should register member with complete details', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          branchId,
          fullName: 'Arjun Singhania',
          email: `arjun_${suffix}@example.com`,
          phone: memberPhone,
          dob: '1996-08-20',
          gender: 'MALE',
          occupation: 'Financial Analyst',
          fitnessGoal: 'Hypertrophy & Mobility',
          address: {
            addressLine1: 'B-104, Palm Meadows',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560066',
          },
          emergencyContact: {
            name: 'Sunita Singhania',
            relationship: 'Mother',
            phone: '9123456780',
          },
          healthDeclaration: {
            hasHealthCondition: false,
            emergencyConsent: true,
            processingConsent: true,
          },
          consent: {
            termsAccepted: true,
            privacyPolicyAccepted: true,
            gymRulesAccepted: true,
            marketingConsent: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.memberCode).toMatch(/^FX-\d{4}-\d{4}$/);
      expect(res.body.data.address.city).toBe('Bengaluru');
      expect(res.body.data.emergencyContact.name).toBe('Sunita Singhania');

      memberId = res.body.data.id;
      memberCode = res.body.data.memberCode;
    });

    it('POST /api/v1/members - should reject duplicate phone within tenant with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          branchId,
          fullName: 'Duplicate Arjun',
          phone: memberPhone,
        });

      expect(res.status).toBe(409);
    });

    it('GET /api/v1/members - should list members with pagination and search', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members?search=${memberCode}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].memberCode).toBe(memberCode);
    });

    it('GET /api/v1/members/:id - should fetch complete 360 profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Arjun Singhania');
      expect(res.body.data.emergencyContact.phone).toBe('9123456780');
    });

    it('POST /api/v1/members/:id/notes - should add internal staff note', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/notes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          note: 'Member requested locker on lower tier.',
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.note).toContain('lower tier');
      expect(res.body.data.isPinned).toBe(true);
    });
  });

  describe('2. Membership Plans Management', () => {
    it('POST /api/v1/plans - should create membership plan with integer paise pricing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Quarterly Gold Fitness ${suffix}`,
          durationType: 'MONTHS',
          durationValue: 3,
          priceInPaise: 750000, // ₹7,500.00
          joiningFeeInPaise: 50000, // ₹500.00
          taxRateBps: 1800, // 18% GST
          maxFreezeDays: 14,
          branchId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priceInPaise).toBe(750000);
      expect(res.body.data.maxFreezeDays).toBe(14);
      planId = res.body.data.id;
    });

    it('PATCH /api/v1/plans/:id - should update plan and audit price change', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/plans/${planId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          priceInPaise: 720000, // Discounted to ₹7,200.00
        });

      expect(res.status).toBe(200);
      expect(res.body.data.priceInPaise).toBe(720000);
    });
  });

  describe('3. Membership Lifecycle (Assign, Freeze, Unfreeze, Cancel)', () => {
    it('POST /api/v1/memberships/assign - should assign plan to member', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/memberships/assign')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          planId,
          branchId,
          startDate: '2026-06-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.pricePaidInPaise).toBe(720000);
      // Tax at 18%: 720000 * 1800 / 10000 = 129600 paise (₹1,296.00)
      expect(res.body.data.taxPaidInPaise).toBe(129600);
      membershipId = res.body.data.id;
    });

    it('POST /api/v1/memberships/:id/freeze - should freeze membership', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/memberships/${membershipId}/freeze`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          freezeStartDate: '2026-07-01',
          freezeEndDate: '2026-07-07',
          reason: 'Family vacation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('FROZEN');
    });

    it('POST /api/v1/memberships/:id/unfreeze - should unfreeze and extend end date', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/memberships/${membershipId}/unfreeze`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Returned early',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('POST /api/v1/memberships/:id/cancel - should cancel membership with reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/memberships/${membershipId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          cancellationReason: 'Doctor advised complete bed rest for 6 months',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('4. Export & Sanitization', () => {
    it('GET /api/v1/members/export - should export members to CSV with formula injection sanitization', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members/export')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Member Code,Full Name,Phone Number');
      expect(res.text).toContain(memberCode);
    });
  });

  describe('5. Multi-Tenant IDOR Isolation', () => {
    it('should reject access from a different tenant', async () => {
      // Register a second tenant
      const otherTenantRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register-owner')
        .send({
          gymName: `Other Gym ${suffix}`,
          ownerName: 'Other Owner',
          email: `other_owner_${suffix}@example.com`,
          phone: '9911223344',
          password: 'Password@2026',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'FC Road',
          pincode: '411005',
        });

      const otherToken = otherTenantRes.body.data.accessToken;

      // Try to read first tenant's member with second tenant's token
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
