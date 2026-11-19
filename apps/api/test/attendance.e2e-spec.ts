import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 4 E2E Integration Suite: Attendance, Check-in, Access Control & Biometric Devices', () => {
  let app: INestApplication;
  let ownerToken: string;
  let branchId: string;
  let memberId: string;
  let planId: string;
  let deviceId: string;
  let deviceCode: string;
  let deviceSecretToken: string;

  const suffix = Date.now();
  const ownerEmail = `phase4_owner_${suffix}@fitnexa.in`;
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
        gymName: `Fitnexa Iron Club ${suffix}`,
        ownerName: 'Vikram Rajput',
        email: ownerEmail,
        phone: '9911223344',
        password: 'Password@2026',
        city: 'Mumbai',
        state: 'Maharashtra',
        address: 'Bandra West, Hill Road',
        pincode: '400050',
      });

    ownerToken = regRes.body.data.accessToken;

    const branchesRes = await request(app.getHttpServer())
      .get('/api/v1/tenant/branches')
      .set('Authorization', `Bearer ${ownerToken}`);
    branchId = branchesRes.body.data[0].id;

    // 2. Create Membership Plan
    const planRes = await request(app.getHttpServer())
      .post('/api/v1/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Quarterly Strength Plan ${suffix}`,
        durationType: 'MONTHS',
        durationValue: 3,
        priceInPaise: 750000,
        taxRateBps: 1800,
        isTaxInclusive: false,
        maxFreezeDays: 14,
        branchId,
      });
    planId = planRes.body.data.id;

    // 3. Register Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        fullName: 'Aryan Sharma',
        phone: memberPhone,
        email: `aryan_${suffix}@fitnexa.in`,
        joiningDate: new Date().toISOString().split('T')[0],
      });
    memberId = memberRes.body.data.id;

    // 4. Assign Plan
    const memRes = await request(app.getHttpServer())
      .post('/api/v1/memberships/assign')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        planId,
        branchId,
        startDate: new Date().toISOString().split('T')[0],
      });
    expect(memRes.body.data.id).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Successfully checks in member and creates an active gym session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        source: 'MANUAL_FRONT_DESK',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.status).toBe('ACTIVE');
    expect(res.body.data.evaluation.decision).toBe('ALLOWED');
    expect(res.body.data.evaluation.reasonCode).toBe('VALID_ACTIVE_MEMBERSHIP');
  });

  it('2. Prevents duplicate check-in within the debouncing window', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        source: 'MANUAL_FRONT_DESK',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Duplicate check-in tap ignored');
  });

  it('3. Reports authentic real-time facility occupancy count', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/attendance/occupancy?branchId=${branchId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.currentlyCheckedIn).toBe(1);
    expect(res.body.data.todayTotalCheckins).toBe(1);
    expect(res.body.data.todayUniqueVisitors).toBe(1);
  });

  it('4. Successfully checks out member and completes session duration', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/check-out')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        source: 'MANUAL_FRONT_DESK',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.session.status).toBe('COMPLETED');
    expect(res.body.data.session.durationInMinutes).toBeGreaterThanOrEqual(1);

    // Verify occupancy drops to 0
    const occRes = await request(app.getHttpServer())
      .get(`/api/v1/attendance/occupancy?branchId=${branchId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(occRes.body.data.currentlyCheckedIn).toBe(0);
  });

  it('5. Clocks in and clocks out staff shift attendance', async () => {
    // Clock in
    const staffRes = await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('Authorization', `Bearer ${ownerToken}`);
    const staffId = staffRes.body.data.items[0].id;

    const inRes = await request(app.getHttpServer())
      .post('/api/v1/staff-attendance/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        staffId,
        branchId,
        notes: 'Opening shift trainer duty',
      });

    expect(inRes.status).toBe(201);
    expect(inRes.body.data.status).toBe('ACTIVE');

    // Duplicate clock-in rejection
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/staff-attendance/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        staffId,
        branchId,
      });
    expect(dupRes.status).toBe(409);

    // Clock out
    const outRes = await request(app.getHttpServer())
      .post('/api/v1/staff-attendance/check-out')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        staffId,
        branchId,
      });

    expect(outRes.status).toBe(201);
    expect(outRes.body.data.status).toBe('COMPLETED');
  });

  it('6. Registers a new biometric terminal and generates secret token', async () => {
    deviceCode = `BIO-MUM-${suffix.toString().slice(-4)}`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        name: 'Turnstile A Ingress',
        deviceCode,
        deviceType: 'BIOMETRIC_FINGERPRINT',
        manufacturer: 'ZKTeco / eSSL Compatible',
        connectionType: 'CLOUD_PUSH_HTTP',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.assignedSecretToken).toBeDefined();

    deviceId = res.body.data.id;
    deviceSecretToken = res.body.data.assignedSecretToken;
  });

  it('7. Maps member to terminal hardware enrollment ID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/devices/${deviceId}/mappings`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        deviceUserId: '9042',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.deviceUserId).toBe('9042');
    expect(res.body.data.memberId).toBe(memberId);
  });

  it('8. Successfully ingests biometric hardware push event and triggers check-in', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/devices/ingest/${deviceCode}`)
      .set('x-device-token', deviceSecretToken)
      .send({
        events: [
          {
            deviceUserId: '9042',
            timestamp: new Date().toISOString(),
            direction: 'CHECK_IN',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.ingestedCount).toBe(1);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    expect(res.body.data.results[0].memberId).toBe(memberId);
  });

  it('9. Idempotently rejects duplicate raw device event ingestion', async () => {
    const fixedTime = '2026-11-20T08:00:00.000Z';
    const firstRes = await request(app.getHttpServer())
      .post(`/api/v1/devices/ingest/${deviceCode}`)
      .set('x-device-token', deviceSecretToken)
      .send({
        events: [
          {
            deviceUserId: '9042',
            timestamp: fixedTime,
            idempotencyKey: `IDEMP-${suffix}`,
          },
        ],
      });
    expect(firstRes.status).toBe(201);

    // Second replay with exact same idempotency key
    const replayRes = await request(app.getHttpServer())
      .post(`/api/v1/devices/ingest/${deviceCode}`)
      .set('x-device-token', deviceSecretToken)
      .send({
        events: [
          {
            deviceUserId: '9042',
            timestamp: fixedTime,
            idempotencyKey: `IDEMP-${suffix}`,
          },
        ],
      });

    expect(replayRes.status).toBe(201);
    expect(replayRes.body.data.results[0].status).toBe('DUPLICATE');
  });

  it('10. Safely quarantines event from unmapped biometric ID and records denial', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/devices/ingest/${deviceCode}`)
      .set('x-device-token', deviceSecretToken)
      .send({
        events: [
          {
            deviceUserId: '9999_UNMAPPED',
            timestamp: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.results[0].status).toBe('UNMAPPED_USER');
  });

  it('11. Rejects device webhook push when token is invalid or missing', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/devices/ingest/${deviceCode}`)
      .set('x-device-token', 'wrong-secret-token')
      .send({
        events: [],
      });

    expect(res.status).toBe(401);
  });

  it('12. Prevents cross-tenant device administration (IDOR Protection)', async () => {
    // Register second tenant
    const otherRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        gymName: `Other Gym ${suffix}`,
        ownerName: 'Other Owner',
        email: `other_${suffix}@fitnexa.in`,
        phone: '9988776655',
        password: 'Password@2026',
        city: 'Pune',
        state: 'Maharashtra',
        address: 'FC Road',
        pincode: '411004',
      });
    const otherToken = otherRes.body.data.accessToken;

    // Attempt to access first tenant's device
    const idorRes = await request(app.getHttpServer())
      .get(`/api/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(idorRes.status).toBe(404);
  });
});
