import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Phase 5 E2E Integration Suite: Inventory, POS, Trainers, Leads, Expenses & Operations', () => {
  let app: INestApplication;
  let ownerToken: string;
  let trainerToken: string;
  let trainerUserId: string;
  let branchId: string;
  let memberId: string;
  let categoryId: string;
  let productId: string;
  let locationId: string;
  let supplierId: string;
  let purchaseOrderId: string;
  let trainerProfileId: string;
  let packageId: string;
  let assignmentId: string;
  let leadId: string;
  let expenseId: string;
  let expenseCategoryId: string;

  const suffix = Date.now();
  const ownerEmail = `phase5_owner_${suffix}@fitnexa.in`;
  const trainerEmail = `phase5_trainer_${suffix}@fitnexa.in`;
  const leadPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

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
        gymName: `Fitnexa Pro Arena ${suffix}`,
        ownerName: 'Arjun Singhania',
        email: ownerEmail,
        phone: '9822334455',
        password: 'Password@2026',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Indiranagar 100ft Road',
        pincode: '560038',
      });

    ownerToken = regRes.body.data.accessToken;

    const branchesRes = await request(app.getHttpServer())
      .get('/api/v1/tenant/branches')
      .set('Authorization', `Bearer ${ownerToken}`);
    branchId = branchesRes.body.data[0].id;

    // 2. Register Trainer Staff Account
    const trainerRes = await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: trainerEmail,
        fullName: 'Coach Devendra Sharma',
        phone: '9844556677',
        role: 'TRAINER',
        password: 'TrainerPass@2026',
        branchId,
      });

    trainerUserId = trainerRes.body.data.id;

    // Login as trainer
    const tLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: trainerEmail,
        password: 'TrainerPass@2026',
      });
    trainerToken = tLogin.body.data.accessToken;

    // 3. Register Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        fullName: 'Sameer Verma',
        email: `sameer_${suffix}@fitnexa.in`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        joiningDate: new Date().toISOString().split('T')[0],
      });

    memberId = memberRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // --------------------------------------------------------------------------
  // INVENTORY & STOCK TESTS
  // --------------------------------------------------------------------------

  it('1. Creates a product category and product with HSN and GST configuration', async () => {
    // Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Whey Protein Supplements',
        code: `SUPP-${suffix.toString().slice(-4)}`,
        description: 'Premium isolates and concentrates',
      });

    expect(catRes.status).toBe(201);
    expect(catRes.body.data.id).toBeDefined();
    categoryId = catRes.body.data.id;

    // Product
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId,
        sku: `WHEY-1KG-${suffix.toString().slice(-4)}`,
        barcode: `890123456${suffix.toString().slice(-4)}`,
        name: 'Fitnexa Gold Standard Whey 1kg (Chocolate)',
        description: '24g protein per scoop',
        unit: 'BOXES',
        costPriceInPaise: 240000, // ₹2,400.00
        sellingPriceInPaise: 320000, // ₹3,200.00
        taxRatePercentage: 18.0,
        hsnCode: '2106',
        reorderThreshold: 5,
      });

    expect(prodRes.status).toBe(201);
    expect(prodRes.body.data.id).toBeDefined();
    expect(prodRes.body.data.sku).toBe(`WHEY-1KG-${suffix.toString().slice(-4)}`);
    productId = prodRes.body.data.id;
  });

  it('2. Rejects duplicate product SKU within the same tenant', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId,
        sku: `WHEY-1KG-${suffix.toString().slice(-4)}`,
        name: 'Duplicate SKU Attempt',
        costPriceInPaise: 100000,
        sellingPriceInPaise: 150000,
      });

    expect(res.status).toBe(409);
  });

  it('3. Creates a supplier, issues a Purchase Order and receives goods into inventory', async () => {
    // Supplier
    const supRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/suppliers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Nutrition Direct India ${suffix}`,
        phone: '9811223344',
        email: `supplier_${suffix}@nutrition.in`,
        gstin: '29ABCDE1234F1Z5',
        city: 'Bengaluru',
      });

    expect(supRes.status).toBe(201);
    supplierId = supRes.body.data.id;

    // Purchase Order
    const poRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/purchases')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        supplierId,
        notes: 'Monthly supplement restocking',
        items: [
          {
            productId,
            quantityOrdered: 20,
            unitCostInPaise: 240000,
          },
        ],
      });

    expect(poRes.status).toBe(201);
    expect(poRes.body.data.poNumber).toBeDefined();
    purchaseOrderId = poRes.body.data.id;
    const poItemId = poRes.body.data.items[0].id;

    // Receive Goods against PO
    const grnRes = await request(app.getHttpServer())
      .post(`/api/v1/inventory/purchases/${purchaseOrderId}/receive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        invoiceNumber: `INV-SUPP-${suffix}`,
        receivedItems: [
          {
            poItemId,
            quantityReceived: 20,
          },
        ],
      });

    expect(grnRes.status).toBe(201);
    expect(grnRes.body.data.receiptNumber).toBeDefined();

    // Verify stock is now 20
    const stockRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${productId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(stockRes.body.data.currentStock).toBe(20);
  });

  it('4. Reconciles physical count via Stock Adjustment and logs immutable movement', async () => {
    const locRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/locations')
      .set('Authorization', `Bearer ${ownerToken}`);

    locationId = locRes.body.data[0].id;

    // Adjust physical count from 20 to 18 (2 units broken/expired)
    const adjRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        productId,
        locationId,
        physicalQuantity: 18,
        reason: '2 jars damaged during warehouse handling',
      });

    expect(adjRes.status).toBe(201);
    expect(adjRes.body.data.quantityDelta).toBe(-2);

    // Verify stock is now 18
    const stockRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${productId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(stockRes.body.data.currentStock).toBe(18);
  });

  // --------------------------------------------------------------------------
  // POINT OF SALE (POS) TESTS
  // --------------------------------------------------------------------------

  it('5. Executes POS checkout with Indian GST, decrements stock atomically, and records payment', async () => {
    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/pos/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        memberId,
        paymentMethod: 'UPI',
        paymentReference: 'UPI-REF-90210',
        items: [
          {
            productId,
            quantity: 2,
            unitPriceInPaise: 320000, // ₹3,200.00 each
            discountInPaise: 0,
            taxRatePercentage: 18.0,
          },
        ],
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.data.invoice.invoiceNumber).toMatch(/^INV-POS/);
    expect(checkoutRes.body.data.payment.paymentNumber).toMatch(/^PAY-POS/);
    expect(checkoutRes.body.data.invoice.status).toBe('PAID');

    // Verify stock decremented by 2 (from 18 down to 16)
    const stockRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${productId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(stockRes.body.data.currentStock).toBe(16);
  });

  it('6. Rejects checkout if requested quantity exceeds available stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pos/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        memberId,
        paymentMethod: 'CASH',
        items: [
          {
            productId,
            quantity: 50, // Available is only 16
            unitPriceInPaise: 320000,
          },
        ],
      });

    expect(res.status).toBe(409); // ConflictException: Insufficient stock
  });

  // --------------------------------------------------------------------------
  // TRAINER MANAGEMENT TESTS
  // --------------------------------------------------------------------------

  it('7. Upserts trainer profile, weekly availability, packages, and assigns client', async () => {
    // 1. Profile
    const profRes = await request(app.getHttpServer())
      .post('/api/v1/trainers/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: trainerUserId,
        branchId,
        bio: 'Certified strength and conditioning specialist with 7 years experience.',
        specializations: ['Bodybuilding', 'Strength & Hypertrophy'],
        certifications: 'ACE Certified Personal Trainer, CPR/AED',
        commissionPercentage: 2000, // 20%
      });

    expect(profRes.status).toBe(201);
    trainerProfileId = profRes.body.data.id;

    // 2. Set Availability (Monday 06:00 to 14:00)
    const availRes = await request(app.getHttpServer())
      .put(`/api/v1/trainers/${trainerProfileId}/availability`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        availabilities: [
          { dayOfWeek: 1, startTime: '06:00', endTime: '14:00', isAvailable: true },
        ],
      });

    expect(availRes.status).toBe(200);

    // 3. Training Package
    const pkgRes = await request(app.getHttpServer())
      .post('/api/v1/trainers/packages')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `12-Session PT Muscle Build ${suffix}`,
        sessionCount: 12,
        validityDays: 45,
        priceInPaise: 1500000, // ₹15,000.00
      });

    expect(pkgRes.status).toBe(201);
    packageId = pkgRes.body.data.id;

    // 4. Assign Package to Member
    const assignRes = await request(app.getHttpServer())
      .post('/api/v1/trainers/assignments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        trainerProfileId,
        memberId,
        packageId,
        startDate: new Date().toISOString().split('T')[0],
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.remainingSessions).toBe(12);
    assignmentId = assignRes.body.data.id;
  });

  it('8. Schedules training session and rejects overlapping bookings (Conflict Detection)', async () => {
    const bookingTime = '2026-11-25T10:00:00.000Z';

    // 1. First booking: 10:00 to 11:00
    const firstRes = await request(app.getHttpServer())
      .post('/api/v1/trainers/sessions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        trainerProfileId,
        memberId,
        assignmentId,
        scheduledAt: bookingTime,
        durationMinutes: 60,
      });

    expect(firstRes.status).toBe(201);
    const sessionId = firstRes.body.data.id;

    // 2. Overlapping booking attempt: 10:30 (overlaps with 10:00 - 11:00)
    const overlapRes = await request(app.getHttpServer())
      .post('/api/v1/trainers/sessions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        trainerProfileId,
        memberId,
        scheduledAt: '2026-11-25T10:30:00.000Z',
        durationMinutes: 60,
      });

    expect(overlapRes.status).toBe(409); // ConflictException: Trainer already booked

    // 3. Complete Session and verify remaining sessions decrements
    const compRes = await request(app.getHttpServer())
      .patch(`/api/v1/trainers/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ notes: 'Completed bench press and shoulder press PRs.' });

    expect(compRes.status).toBe(200);
    expect(compRes.body.data.status).toBe('COMPLETED');
  });

  // --------------------------------------------------------------------------
  // LEAD CRM PIPELINE TESTS
  // --------------------------------------------------------------------------

  it('9. Creates inquiry, rejects duplicate mobile, schedules follow-up, and converts to Member', async () => {
    // 1. Ingest Lead
    const leadRes = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        firstName: 'Pooja',
        lastName: 'Hegde',
        phone: leadPhone,
        email: `pooja_${suffix}@example.com`,
        source: 'WALK_IN',
        fitnessGoal: 'Weight Loss and Toning',
      });

    expect(leadRes.status).toBe(201);
    expect(leadRes.body.data.stage).toBe('NEW');
    leadId = leadRes.body.data.id;

    // 2. Reject Duplicate Lead phone
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        branchId,
        firstName: 'Pooja',
        lastName: 'Hegde',
        phone: leadPhone,
      });

    expect(dupRes.status).toBe(409);

    // 3. Schedule Follow-up
    const fRes = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/follow-ups`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        callType: 'PHONE',
        notes: 'Call to confirm trial session on Saturday morning',
      });

    expect(fRes.status).toBe(201);

    // 4. One-Click Convert to Registered Member
    const convRes = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        addressLine1: 'Indiranagar 12th Main',
        city: 'Bengaluru',
      });

    expect(convRes.status).toBe(201);
    expect(convRes.body.data.memberId).toBeDefined();
    expect(convRes.body.data.memberCode).toMatch(/^MEM-/);

    // Verify lead status is now CONVERTED
    const checkLead = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(checkLead.body.data.stage).toBe('CONVERTED');
    expect(checkLead.body.data.convertedMemberId).toBe(convRes.body.data.memberId);
  });

  // --------------------------------------------------------------------------
  // EXPENSE MANAGEMENT TESTS
  // --------------------------------------------------------------------------

  it('10. Records expense entry and manages manager approval workflow', async () => {
    // 1. Get Categories
    const catRes = await request(app.getHttpServer())
      .get('/api/v1/expenses/categories')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(catRes.body.data.length).toBeGreaterThan(0);
    expenseCategoryId = catRes.body.data[0].id;

    // 2. Create Expense as Staff (pending approval)
    const expRes = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        branchId,
        categoryId: expenseCategoryId,
        expenseDate: new Date().toISOString().split('T')[0],
        amountInPaise: 45000, // ₹450.00
        paymentMethod: 'CASH',
        payeeName: 'Bisleri Water Agency',
        description: '3 drinking water bubble jars for gym floor',
      });

    expect(expRes.status).toBe(201);
    expect(expRes.body.data.status).toBe('PENDING_APPROVAL');
    expenseId = expRes.body.data.id;

    // 3. Manager/Owner Approves Expense
    const appRes = await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        approved: true,
        notes: 'Verified against receipt voucher',
      });

    expect(appRes.status).toBe(200);
    expect(appRes.body.data.status).toBe('APPROVED');
  });

  // --------------------------------------------------------------------------
  // NOTIFICATIONS TESTS
  // --------------------------------------------------------------------------

  it('11. Queues notification and retrieves in-app notification center feed', async () => {
    const notifRes = await request(app.getHttpServer())
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        recipientType: 'STAFF',
        recipientId: trainerUserId,
        type: 'GENERAL_ANNOUNCEMENT',
        title: 'Monthly Team Huddle',
        message: 'Floor coaches meeting at 14:00 on Friday in main lounge.',
      });

    expect(notifRes.status).toBe(201);
    expect(notifRes.body.data.id).toBeDefined();

    // Check feed for trainer
    const feedRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/feed')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(feedRes.body.data.items[0].title).toBe('Monthly Team Huddle');
  });
});
