import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 3 E2E Integration Suite: Billing, Payments, Dues, Renewals, Refunds & Cash Register', () => {
  let app: INestApplication;
  let ownerToken: string;
  let branchId: string;
  let memberId: string;
  let planId: string;
  let invoiceId: string;
  let paymentId: string;
  let receiptId: string;
  let cashSessionId: string;

  const suffix = Date.now();
  const ownerEmail = `phase3_owner_${suffix}@fitnexa.in`;
  const memberPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

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
        gymName: `Fitnexa Gold Club ${suffix}`,
        ownerName: 'Kabir Malhotra',
        email: ownerEmail,
        phone: '9900112233',
        password: 'Password@2026',
        city: 'Delhi',
        state: 'Delhi',
        address: 'Connaught Place, Block B',
        pincode: '110001',
      });

    ownerToken = regRes.body.data.accessToken;

    const branchesRes = await request(app.getHttpServer())
      .get('/api/v1/tenant/branches')
      .set('Authorization', `Bearer ${ownerToken}`);

    branchId = branchesRes.body.data[0].id;

    // 2. Register Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        fullName: 'Devendra Singhal',
        phone: memberPhone,
        joiningDate: '2026-06-01',
      });

    memberId = memberRes.body.data.id;

    // 3. Create Membership Plan
    const planRes = await request(app.getHttpServer())
      .post('/api/v1/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Annual Strength Pro ${suffix}`,
        durationType: 'MONTHS',
        durationValue: 12,
        priceInPaise: 1200000, // ₹12,000.00
        taxRateBps: 1800, // 18% GST
        branchId,
      });

    planId = planRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Invoice Issuance & Calculation (Integer Paise & GST)', () => {
    it('POST /api/v1/billing/invoices - should generate tax invoice with sequential number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          branchId,
          dueDate: '2026-06-15',
          isTaxInclusive: false,
          lineItems: [
            {
              description: 'Annual Gym Membership',
              quantity: 1,
              unitPriceInPaise: 1200000, // ₹12,000.00
              taxRateBps: 1800, // 18% GST = 216000 paise (₹2,160.00)
              itemType: 'PLAN',
              referenceId: planId,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toMatch(/^FX-INV-\d{4}-\d{6}$/);
      expect(res.body.data.subtotalInPaise).toBe(1200000);
      expect(res.body.data.taxAmountInPaise).toBe(216000);
      expect(res.body.data.grandTotalInPaise).toBe(1416000); // ₹14,160.00
      expect(res.body.data.balanceDueInPaise).toBe(1416000);
      expect(res.body.data.status).toBe('ISSUED');

      invoiceId = res.body.data.id;
    });

    it('GET /api/v1/billing/invoices - should list issued invoices', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices?memberId=${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].id).toBe(invoiceId);
    });
  });

  describe('2. Partial Payments & Outstanding Dues', () => {
    it('POST /api/v1/billing/payments - should collect partial payment of ₹5,000 (500000 paise)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          branchId,
          amountInPaise: 500000, // ₹5,000.00
          method: 'UPI',
          referenceNumber: 'UPI-UTR-9988776655',
          allocations: [
            {
              invoiceId,
              amountInPaise: 500000,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentNumber).toMatch(/^FX-PAY-\d{4}-\d{6}$/);
      expect(res.body.data.amountInPaise).toBe(500000);
      expect(res.body.data.receipt).toBeDefined();

      paymentId = res.body.data.id;
      receiptId = res.body.data.receipt.id;

      // Verify invoice state updated to PARTIALLY_PAID
      const invRes = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(invRes.body.data.status).toBe('PARTIALLY_PAID');
      expect(invRes.body.data.paidAmountInPaise).toBe(500000);
      expect(invRes.body.data.balanceDueInPaise).toBe(916000); // 1416000 - 500000 = 916000 (₹9,160)
    });

    it('POST /api/v1/billing/payments - should prevent overpayment beyond outstanding balance (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          branchId,
          amountInPaise: 1000000, // ₹10,000 exceeds remaining ₹9,160
          method: 'CASH',
          allocations: [
            {
              invoiceId,
              amountInPaise: 1000000,
            },
          ],
        });

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/billing/payments - should collect final payment of ₹9,160 and transition invoice to PAID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          branchId,
          amountInPaise: 916000, // Exact remaining balance
          method: 'BANK_TRANSFER',
          referenceNumber: 'NEFT-AXIS-009988',
          allocations: [
            {
              invoiceId,
              amountInPaise: 916000,
            },
          ],
        });

      expect(res.status).toBe(201);

      // Verify invoice is fully settled
      const invRes = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(invRes.body.data.status).toBe('PAID');
      expect(invRes.body.data.balanceDueInPaise).toBe(0);
      expect(invRes.body.data.paidAmountInPaise).toBe(1416000);
    });
  });

  describe('3. Dues & Aging Management', () => {
    it('GET /api/v1/billing/dues - should return dues summary and aging breakdown', async () => {
      // Create an overdue invoice for testing dues
      await request(app.getHttpServer())
        .post('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          branchId,
          dueDate: '2026-05-01', // Past date -> overdue
          lineItems: [
            {
              description: 'Personal Training Consultation',
              quantity: 1,
              unitPriceInPaise: 300000, // ₹3,000
              taxRateBps: 0,
              itemType: 'SERVICE',
            },
          ],
        });

      const res = await request(app.getHttpServer())
        .get('/api/v1/billing/dues')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalOutstandingPaise).toBeGreaterThanOrEqual(300000);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Payment Receipts', () => {
    it('GET /api/v1/billing/receipts/:id - should retrieve official receipt metadata', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/billing/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toMatch(/^FX-REC-\d{4}-\d{6}$/);
      expect(res.body.data.payment.amountInPaise).toBe(500000);
    });
  });

  describe('5. Membership Renewals', () => {
    it('POST /api/v1/billing/renewals - should renew membership, chain start date, and generate invoice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/renewals')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberId,
          planId,
          branchId,
          downPaymentInPaise: 200000, // ₹2,000 immediate down payment
          downPaymentMethod: 'UPI',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.membership.status).toBe('ACTIVE');
      expect(res.body.data.invoice.invoiceNumber).toBeDefined();
      expect(res.body.data.payment).toBeDefined();
    });
  });

  describe('6. Cash Register Drawer Sessions', () => {
    it('POST /api/v1/billing/cash-register/open - should open cash session with float amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/cash-register/open')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          branchId,
          openingFloatInPaise: 500000, // ₹5,000 float
          notes: 'Morning shift drawer',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.openingFloatInPaise).toBe(500000);
      cashSessionId = res.body.data.id;
    });

    it('POST /api/v1/billing/cash-register/:id/close - should close session with counted cash and variance calculation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/billing/cash-register/${cashSessionId}/close`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          actualClosingPaise: 500000, // Exact match
          notes: 'Reconciled without variance',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data.varianceInPaise).toBe(0);
    });
  });

  describe('7. Refunds & Approval Workflow', () => {
    let refundId: string;

    it('POST /api/v1/billing/refunds/request - should request refund against payment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/refunds/request')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          paymentId,
          amountInPaise: 100000, // ₹1,000 refund
          reason: 'Member entitled to special promotional rebate',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.refundNumber).toMatch(/^FX-REF-\d{4}-\d{6}$/);
      expect(res.body.data.status).toBe('PENDING_APPROVAL');
      refundId = res.body.data.id;
    });

    it('POST /api/v1/billing/refunds/:id/approve - should approve refund by Owner', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/billing/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          approved: true,
          notes: 'Approved by Club Owner',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('POST /api/v1/billing/refunds/:id/process - should confirm payout reference and process refund', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/billing/refunds/${refundId}/process`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          payoutReference: 'IMPS-REF-11223344',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PROCESSED');
    });
  });

  describe('8. Multi-Tenant IDOR Isolation', () => {
    it('should reject access to invoice from another tenant', async () => {
      // Register second tenant
      const otherTenantRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register-owner')
        .send({
          gymName: `Other Gym Club ${suffix}`,
          ownerName: 'Other Owner',
          email: `other_owner_phase3_${suffix}@example.com`,
          phone: '9922334455',
          password: 'Password@2026',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'MG Road',
          pincode: '411001',
        });

      const otherToken = otherTenantRes.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
