const { PrismaClient } = require('C:/Fitnexa/node_modules/.pnpm/@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e/node_modules/@prisma/client');
const bcrypt = require('C:/Fitnexa/node_modules/.pnpm/bcrypt@6.0.0/node_modules/bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Master Fitnexa Tenant with complete enterprise gym data...');

  const passwordHash = await bcrypt.hash('Password@2026', 10);

  // 1. Create or Find Tenant
  let tenant = await prisma.tenant.findFirst({
    where: { slug: 'fitnexa-elite-flagship' }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Fitnexa Elite Fitness & Sports Club',
        slug: 'fitnexa-elite-flagship',
        gstin: '29ABCDE1234F1Z5',
        phone: '9880123456',
        email: 'toshak10243@gmail.com',
        address: '88/1, 100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Branches
  let branchA = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, code: 'IND-01' }
  });
  if (!branchA) {
    branchA = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Indiranagar Flagship Facility',
        code: 'IND-01',
        address: '88/1, 100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '9880123456',
        isMainBranch: true,
        status: 'ACTIVE'
      }
    });
  }

  let branchB = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, code: 'KOR-02' }
  });
  if (!branchB) {
    branchB = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Koramangala Pro Center',
        code: 'KOR-02',
        address: '4th Block, 80 Feet Road, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        phone: '9880654321',
        isMainBranch: false,
        status: 'ACTIVE'
      }
    });
  }

  // 3. Master Users
  const usersToUpsert = [
    {
      email: 'toshak10243@gmail.com',
      fullName: 'Toshak (Gym Owner)',
      role: 'GYM_OWNER',
      phone: '9880123456',
      branchId: branchA.id
    },
    {
      email: 'admin@fitnexa.com',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '9880111222',
      branchId: branchA.id
    },
    {
      email: 'manager@fitnexa.com',
      fullName: 'Vikramaditya Rao (Branch Manager)',
      role: 'BRANCH_MANAGER',
      phone: '9880222333',
      branchId: branchA.id
    },
    {
      email: 'frontdesk@fitnexa.com',
      fullName: 'Pooja Verma (Front Desk)',
      role: 'FRONT_DESK',
      phone: '9880333444',
      branchId: branchA.id
    },
    {
      email: 'trainer@fitnexa.com',
      fullName: 'Coach Rajesh Sharma',
      role: 'TRAINER',
      phone: '9880444555',
      branchId: branchA.id
    }
  ];

  let toshakUserId = null;
  for (const u of usersToUpsert) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          tenantId: tenant.id,
          branchId: u.branchId,
          role: u.role,
          status: 'ACTIVE'
        }
      });
      if (u.email === 'toshak10243@gmail.com') toshakUserId = updated.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          passwordHash,
          role: u.role,
          tenantId: tenant.id,
          branchId: u.branchId,
          status: 'ACTIVE'
        }
      });
      if (u.email === 'toshak10243@gmail.com') toshakUserId = created.id;
    }
  }

  // 4. Membership Plans
  const plansData = [
    { name: '12-Month Elite Annual Fitness', durationType: 'MONTHS', durationValue: 12, priceInPaise: 2400000, taxRateBps: 1800 },
    { name: '6-Month Transformation Pro', durationType: 'MONTHS', durationValue: 6, priceInPaise: 1400000, taxRateBps: 1800 },
    { name: '3-Month Strength & Conditioning', durationType: 'MONTHS', durationValue: 3, priceInPaise: 850000, taxRateBps: 1800 },
    { name: '1-Month Flex Membership', durationType: 'MONTHS', durationValue: 1, priceInPaise: 320000, taxRateBps: 1800 }
  ];

  const plans = [];
  for (const p of plansData) {
    let plan = await prisma.membershipPlan.findFirst({
      where: { tenantId: tenant.id, name: p.name }
    });
    if (!plan) {
      plan = await prisma.membershipPlan.create({
        data: {
          tenantId: tenant.id,
          name: p.name,
          durationType: p.durationType,
          durationValue: p.durationValue,
          priceInPaise: p.priceInPaise,
          taxRateBps: p.taxRateBps,
          isActive: true
        }
      });
    }
    plans.push(plan);
  }

  // 5. Members
  const memberBios = [
    { firstName: 'Arjun', lastName: 'Kapoor', phone: '9845011111', gender: 'MALE', email: 'arjun.kapoor@example.com' },
    { firstName: 'Deepika', lastName: 'Padukone', phone: '9845022222', gender: 'FEMALE', email: 'deepika.p@example.com' },
    { firstName: 'Ranveer', lastName: 'Singh', phone: '9845033333', gender: 'MALE', email: 'ranveer.s@example.com' },
    { firstName: 'Alia', lastName: 'Bhatt', phone: '9845044444', gender: 'FEMALE', email: 'alia.b@example.com' },
    { firstName: 'Rohit', lastName: 'Sharma', phone: '9845055555', gender: 'MALE', email: 'rohit.s@example.com' },
    { firstName: 'Virat', lastName: 'Kohli', phone: '9845066666', gender: 'MALE', email: 'virat.k@example.com' },
    { firstName: 'Smriti', lastName: 'Mandhana', phone: '9845077777', gender: 'FEMALE', email: 'smriti.m@example.com' },
    { firstName: 'KL', lastName: 'Rahul', phone: '9845088888', gender: 'MALE', email: 'kl.rahul@example.com' }
  ];

  const members = [];
  for (let i = 0; i < memberBios.length; i++) {
    const b = memberBios[i];
    let member = await prisma.member.findFirst({
      where: { tenantId: tenant.id, phone: b.phone }
    });
    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: tenant.id,
          branchId: branchA.id,
          memberCode: `FIT-${1000 + i + 1}`,
          fullName: `${b.firstName} ${b.lastName}`,
          phone: b.phone,
          email: b.email,
          gender: b.gender,
          joiningDate: new Date(),
          status: 'ACTIVE'
        }
      });

      // Address
      await prisma.memberAddress.create({
        data: {
          memberId: member.id,
          addressLine1: 'Indiranagar Main',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
          country: 'India'
        }
      });

      // Health declaration
      await prisma.memberHealthDeclaration.create({
        data: {
          memberId: member.id,
          hasHealthCondition: false,
          emergencyConsent: true,
          processingConsent: true
        }
      });

      // Assign Membership
      const assignedPlan = plans[i % plans.length];
      const durationDays = assignedPlan.durationValue * 30;
      const startDate = new Date();
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const basePrice = assignedPlan.priceInPaise;
      const taxAmount = Math.round((basePrice * assignedPlan.taxRateBps) / 10000);
      const totalAmount = basePrice + taxAmount;
      const isPaid = i % 3 !== 0; // 2 out of 3 paid, 1 with dues

      const membership = await prisma.memberMembership.create({
        data: {
          tenantId: tenant.id,
          branchId: branchA.id,
          memberId: member.id,
          planId: assignedPlan.id,
          startDate,
          endDate,
          pricePaidInPaise: basePrice,
          taxPaidInPaise: taxAmount,
          status: 'ACTIVE'
        }
      });

      const paidAmount = isPaid ? totalAmount : Math.round(totalAmount / 2);
      const balanceDue = totalAmount - paidAmount;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branchA.id,
          memberId: member.id,
          membershipId: membership.id,
          invoiceNumber: `INV-2026-${100 + i}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          subtotalInPaise: basePrice,
          taxAmountInPaise: taxAmount,
          taxRateBps: assignedPlan.taxRateBps,
          grandTotalInPaise: totalAmount,
          paidAmountInPaise: paidAmount,
          balanceDueInPaise: balanceDue,
          status: isPaid ? 'PAID' : 'PARTIALLY_PAID',
          lineItems: {
            create: [
              {
                description: assignedPlan.name,
                itemType: 'PLAN',
                quantity: 1,
                unitPriceInPaise: basePrice,
                taxRateBps: assignedPlan.taxRateBps,
                taxAmountInPaise: taxAmount,
                totalAmountInPaise: totalAmount
              }
            ]
          }
        }
      });

      // Payment
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          branchId: branchA.id,
          memberId: member.id,
          paymentNumber: `PAY-2026-${100 + i}`,
          paymentDate: new Date(),
          amountInPaise: paidAmount,
          method: i % 2 === 0 ? 'UPI' : 'CARD_MANUAL',
          referenceNumber: `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          status: 'VERIFIED',
          collectedBy: toshakUserId
        }
      });

      // Member check-in for today
      if (i < 6) {
        await prisma.memberAttendance.create({
          data: {
            tenantId: tenant.id,
            branchId: branchA.id,
            memberId: member.id,
            timestamp: new Date(Date.now() - (i * 45 + 10) * 60 * 1000),
            direction: 'CHECK_IN',
            source: 'MANUAL_FRONT_DESK'
          }
        });
      }
    }
    members.push(member);
  }

  // 6. Products
  const productsData = [
    { name: 'Optimum Nutrition Gold Standard Whey 2kg', sku: 'ON-WHEY-2KG', catCode: 'SUPP', catName: 'Supplements', retailPricePaise: 650000, costPricePaise: 480000, reorder: 10 },
    { name: 'MuscleBlaze Creatine Monohydrate 250g', sku: 'MB-CREAT-250', catCode: 'SUPP', catName: 'Supplements', retailPricePaise: 119900, costPricePaise: 75000, reorder: 15 },
    { name: 'Fitnexa Pro Stainless Shaker 750ml', sku: 'FIT-SHAKE-750', catCode: 'ACC', catName: 'Accessories', retailPricePaise: 69900, costPricePaise: 29000, reorder: 20 },
    { name: 'Pure Raw Whey Isolate 1kg', sku: 'RAW-ISO-1KG', catCode: 'SUPP', catName: 'Supplements', retailPricePaise: 380000, costPricePaise: 260000, reorder: 8 }
  ];

  for (const p of productsData) {
    let cat = await prisma.productCategory.findFirst({
      where: { tenantId: tenant.id, code: p.catCode }
    });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: { tenantId: tenant.id, code: p.catCode, name: p.catName }
      });
    }

    let prod = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: p.sku }
    });
    if (!prod) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: cat.id,
          name: p.name,
          sku: p.sku,
          sellingPriceInPaise: p.retailPricePaise,
          costPriceInPaise: p.costPricePaise,
          taxRatePercentage: 18.0,
          hsnCode: '21069099',
          reorderThreshold: p.reorder,
          isActive: true
        }
      });
    }
  }

  // 7. Leads
  const leadsData = [
    { firstName: 'Siddharth', lastName: 'Malhotra', phone: '9899112233', stage: 'NEW', source: 'SOCIAL_MEDIA' },
    { firstName: 'Kiara', lastName: 'Advani', phone: '9899223344', stage: 'TRIAL_SCHEDULED', source: 'WALK_IN' },
    { firstName: 'Varun', lastName: 'Dhawan', phone: '9899334455', stage: 'CONVERTED', source: 'REFERRAL' }
  ];

  for (const l of leadsData) {
    let lead = await prisma.lead.findFirst({
      where: { tenantId: tenant.id, phone: l.phone }
    });
    if (!lead) {
      await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          branchId: branchA.id,
          firstName: l.firstName,
          lastName: l.lastName,
          phone: l.phone,
          stage: l.stage,
          source: l.source
        }
      });
    }
  }

  console.log('Master Fitnexa Tenant seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
