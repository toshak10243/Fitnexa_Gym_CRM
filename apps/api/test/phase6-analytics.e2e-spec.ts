import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 6 E2E Integration Suite: Executive Dashboard, Analytics Reports & Exports', () => {
  let app: INestApplication;
  let ownerToken: string;
  let branchId: string;
  let memberId: string;

  const suffix = Date.now();
  const ownerEmail = `phase6_owner_${suffix}@fitnexa.in`;
  const memberEmail = `phase6_member_${suffix}@fitnexa.in`;
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
        gymName: `Fitnexa Analytics Club ${suffix}`,
        ownerName: 'Vikramaditya Roy',
        email: ownerEmail,
        phone: '9811223344',
        password: 'Password@2026',
        city: 'Mumbai',
        state: 'Maharashtra',
        address: 'Bandra West Linking Road',
        pincode: '400050',
      });

    ownerToken = regRes.body.data.accessToken;

    const branchesRes = await request(app.getHttpServer())
      .get('/api/v1/tenant/branches')
      .set('Authorization', `Bearer ${ownerToken}`);
    branchId = branchesRes.body.data[0].id;

    // 2. Register Member
    const memRes = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        fullName: 'Rahul Dravid Sharma',
        phone: memberPhone,
        email: memberEmail,
        joiningDate: new Date().toISOString().split('T')[0],
      });

    memberId = memRes.body.data.id;

    // 3. Create Plan
    const planRes = await request(app.getHttpServer())
      .post('/api/v1/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Executive Quarterly Plan ${suffix}`,
        durationType: 'MONTHS',
        durationValue: 3,
        priceInPaise: 900000,
        joiningFeeInPaise: 50000,
        taxRateBps: 1800,
        maxFreezeDays: 14,
        branchId,
      });

    const planId = planRes.body.data.id;

    // 4. Assign Membership
    await request(app.getHttpServer())
      .post('/api/v1/memberships/assign')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        planId,
        branchId,
        startDate: new Date().toISOString().split('T')[0],
      });

    // 5. Create Invoice
    const invRes = await request(app.getHttpServer())
      .post('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isTaxInclusive: false,
        lineItems: [
          {
            description: 'Executive Quarterly Membership Subscription',
            quantity: 1,
            unitPriceInPaise: 900000,
            taxRateBps: 1800,
            itemType: 'PLAN',
            referenceId: planId,
          },
        ],
      });

    const invoiceId = invRes.body.data.id;

    // 6. Record Payment
    await request(app.getHttpServer())
      .post('/api/v1/billing/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        amountInPaise: 500000,
        method: 'UPI',
        referenceNumber: `UPI-TEST-${suffix}`,
        allocations: [
          {
            invoiceId,
            amountInPaise: 500000,
          },
        ],
      });

    // 7. Member Attendance Check-In
    await request(app.getHttpServer())
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberId,
        branchId,
        source: 'MANUAL_FRONT_DESK',
      });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1. GET /analytics/dashboard should return structured real KPIs across all 4 quadrants', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = res.body.data;
    expect(body.timezone).toBe('Asia/Kolkata');
    expect(body.memberships).toBeDefined();
    expect(body.attendance).toBeDefined();
    expect(body.financials).toBeDefined();
    expect(body.operations).toBeDefined();

    // Verify membership metrics
    expect(body.memberships.totalActiveMembers).toBeGreaterThanOrEqual(1);
    expect(body.memberships.newRegistrationsToday).toBeGreaterThanOrEqual(1);
    expect(body.memberships.activeMemberships).toBeGreaterThanOrEqual(1);

    // Verify attendance metrics
    expect(body.attendance.todayCheckIns).toBeGreaterThanOrEqual(1);
    expect(body.attendance.currentOccupancy).toBeGreaterThanOrEqual(1);

    // Verify financials
    expect(body.financials.grossCollectionsPaise).toBeGreaterThanOrEqual(500000);
    expect(body.financials.todayCollectionsPaise).toBeGreaterThanOrEqual(500000);
    expect(body.financials.outstandingDuesPaise).toBeGreaterThan(0);
  });

  it('2. GET /analytics/dashboard with branch filter should restrict metrics correctly', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/dashboard?branchId=${branchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.data.memberships.totalActiveMembers).toBeGreaterThanOrEqual(1);
  });

  it('3. GET /analytics/reports/membership-summary should return itemized records and summary', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/membership-summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const data = res.body.data;
    expect(data.reportType).toBe('membership-summary');
    expect(data.summary.totalActiveMembers).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.records)).toBe(true);
    expect(data.records.length).toBeGreaterThanOrEqual(1);
    expect(data.records[0].memberName).toBe('Rahul Dravid Sharma');
  });

  it('4. GET /analytics/reports/financial-collections should return collection records', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/financial-collections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const data = res.body.data;
    expect(data.reportType).toBe('financial-collections');
    expect(data.summary.totalCollectedPaise).toBeGreaterThanOrEqual(500000);
    expect(data.records.length).toBeGreaterThanOrEqual(1);
    expect(data.records[0].amountInPaise).toBe(500000);
  });

  it('5. GET /analytics/reports/attendance-patterns should return attendance history', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/attendance-patterns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const data = res.body.data;
    expect(data.reportType).toBe('attendance-patterns');
    expect(data.summary.totalCheckIns).toBeGreaterThanOrEqual(1);
    expect(data.records[0].direction).toBe('CHECK_IN');
  });

  it('6. GET /analytics/reports/inventory-velocity should list active catalog with stock', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/inventory-velocity')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.data.reportType).toBe('inventory-velocity');
    expect(Array.isArray(res.body.data.records)).toBe(true);
  });

  it('7. GET /analytics/reports/lead-conversions should return sales inquiry metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/lead-conversions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.data.reportType).toBe('lead-conversions');
    expect(res.body.data.summary.conversionRatePercent).toBeDefined();
  });

  it('8. GET /analytics/exports/financial-collections should stream sanitized CSV with audit logging', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/exports/financial-collections')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="fitnexa-financial-collections');
    expect(res.text).toContain('"paymentNumber"');
    expect(res.text).toContain('500000');
  });

  it('9. Export Sanitizer must mitigate CSV Formula Injection (=, +, -, @ prefixes)', async () => {
    const { ExportSanitizerService } = await import('../src/modules/analytics/services/export-sanitizer.service');
    const sanitizer = new ExportSanitizerService({ record: jest.fn() } as any);

    // Formula injection attempts
    expect(sanitizer.sanitizeCell('=cmd|"/c calc"!A0')).toBe(`"'=cmd|""/c calc""!A0"`);
    expect(sanitizer.sanitizeCell('+12345')).toBe(`"'+12345"`);
    expect(sanitizer.sanitizeCell('-100')).toBe(`"'-100"`);
    expect(sanitizer.sanitizeCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
    expect(sanitizer.sanitizeCell('Normal Text')).toBe(`"Normal Text"`);
  });

  it('10. Reject unauthenticated or unauthorized access to executive analytics', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .expect(401);
  });
});
