const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
const bcrypt = require('../apps/api/node_modules/bcrypt');

const prisma = new PrismaClient();

async function clean() {
  console.log('--- Cleaning up database for real testing ---');

  // 1. Delete Attendance & Device data
  console.log('1. Deleting attendance records and device mappings...');
  await prisma.accessDecision.deleteMany({});
  await prisma.attendanceCorrection.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.memberAttendance.deleteMany({});
  await prisma.staffAttendance.deleteMany({});
  await prisma.deviceMemberMapping.deleteMany({});
  await prisma.deviceEventInbox.deleteMany({});
  await prisma.deviceSyncJob.deleteMany({});
  await prisma.deviceSyncCursor.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.attendancePolicy.deleteMany({});

  // 2. Delete Billing & Payments
  console.log('2. Deleting billing and payments...');
  await prisma.creditNote.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.cashRegisterSession.deleteMany({});
  await prisma.memberAccountLedger.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});

  // 3. Delete Member data
  console.log('3. Deleting member profiles, documents, consents, declarations...');
  await prisma.memberNote.deleteMany({});
  await prisma.memberActivity.deleteMany({});
  await prisma.memberDocument.deleteMany({});
  await prisma.memberConsent.deleteMany({});
  await prisma.memberHealthDeclaration.deleteMany({});
  await prisma.memberEmergencyContact.deleteMany({});
  await prisma.memberAddress.deleteMany({});
  await prisma.membershipStatusHistory.deleteMany({});
  await prisma.memberMembership.deleteMany({});
  await prisma.memberImportRow.deleteMany({});
  await prisma.memberImportBatch.deleteMany({});
  await prisma.member.deleteMany({});

  // 4. Delete Inventory & Stock
  console.log('4. Deleting inventory, stock movements, products, suppliers...');
  await prisma.inventoryTransferItem.deleteMany({});
  await prisma.inventoryTransfer.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockLocation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.supplier.deleteMany({});

  // 5. Delete Trainer data
  console.log('5. Deleting trainer sessions, assignments, packages, profiles...');
  await prisma.trainingSession.deleteMany({});
  await prisma.trainerAssignment.deleteMany({});
  await prisma.trainingPackage.deleteMany({});
  await prisma.trainerAvailability.deleteMany({});
  await prisma.trainerProfile.deleteMany({});

  // 6. Delete CRM leads
  console.log('6. Deleting CRM leads and followups...');
  await prisma.leadActivity.deleteMany({});
  await prisma.leadFollowUp.deleteMany({});
  await prisma.lead.deleteMany({});

  // 7. Delete Expenses
  console.log('7. Deleting expenses...');
  await prisma.recurringExpense.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.expenseCategory.deleteMany({});

  // 8. Delete Notifications & Audit Logs
  console.log('8. Deleting notifications and audit logs...');
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.notificationTemplate.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.systemHealthRecord.deleteMany({});

  // 9. Remove all fake users (Keep only superadmin and toshak)
  console.log('9. Removing fake staff and users...');
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        notIn: ['superadmin@fitnexa.com', 'toshak10243@gmail.com']
      }
    }
  });
  console.log(`Deleting ${usersToDelete.length} fake users:`, usersToDelete.map(u => u.email));
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['superadmin@fitnexa.com', 'toshak10243@gmail.com']
      }
    }
  });

  // 10. Ensure single clean Tenant: Fitnexa Elite
  console.log('10. Ensuring single clean tenant...');
  const tenants = await prisma.tenant.findMany();
  let masterTenant = tenants.find(t => t.slug === 'fitnexa-elite-flagship') || tenants[0];
  
  if (!masterTenant) {
    masterTenant = await prisma.tenant.create({
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

  // Delete any other tenants
  await prisma.tenant.deleteMany({
    where: {
      id: { not: masterTenant.id }
    }
  });

  // 11. Ensure single main branch
  console.log('11. Ensuring single main branch...');
  let mainBranch = await prisma.branch.findFirst({
    where: { tenantId: masterTenant.id, isMainBranch: true }
  });
  if (!mainBranch) {
    mainBranch = await prisma.branch.findFirst({
      where: { tenantId: masterTenant.id }
    });
  }
  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        tenantId: masterTenant.id,
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
  } else {
    await prisma.branch.update({
      where: { id: mainBranch.id },
      data: { isMainBranch: true, status: 'ACTIVE' }
    });
  }

  // Delete any other branches
  await prisma.branch.deleteMany({
    where: {
      tenantId: masterTenant.id,
      id: { not: mainBranch.id }
    }
  });

  // 12. Update/Upsert Toshak Gym Owner
  const passwordHash = await bcrypt.hash('Password@2026', 10);
  let toshakUser = await prisma.user.findUnique({
    where: { email: 'toshak10243@gmail.com' }
  });

  if (!toshakUser) {
    toshakUser = await prisma.user.create({
      data: {
        email: 'toshak10243@gmail.com',
        fullName: 'Toshak Sharma',
        phone: '9880123456',
        passwordHash,
        role: 'GYM_OWNER',
        status: 'ACTIVE',
        tenantId: masterTenant.id,
        branchId: mainBranch.id,
        mustChangePassword: false
      }
    });
  } else {
    await prisma.user.update({
      where: { id: toshakUser.id },
      data: {
        fullName: 'Toshak Sharma',
        passwordHash,
        role: 'GYM_OWNER',
        status: 'ACTIVE',
        tenantId: masterTenant.id,
        branchId: mainBranch.id,
        mustChangePassword: false
      }
    });
  }

  // 13. Ensure Super Admin user
  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@2026', 12);
  let superAdminUser = await prisma.user.findUnique({
    where: { email: 'superadmin@fitnexa.com' }
  });
  if (!superAdminUser) {
    await prisma.user.create({
      data: {
        email: 'superadmin@fitnexa.com',
        fullName: 'Fitnexa Platform Owner',
        phone: '9999999999',
        passwordHash: superAdminPasswordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false
      }
    });
  } else {
    await prisma.user.update({
      where: { id: superAdminUser.id },
      data: {
        fullName: 'Fitnexa Platform Owner',
        passwordHash: superAdminPasswordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false
      }
    });
  }

  // 14. Keep 2 Clean Standard Membership Plans for easy testing (or user can edit them)
  await prisma.membershipPlan.deleteMany({
    where: { tenantId: masterTenant.id }
  });
  await prisma.membershipPlan.createMany({
    data: [
      {
        tenantId: masterTenant.id,
        name: 'Monthly Standard Fitness',
        durationType: 'MONTHS',
        durationValue: 1,
        priceInPaise: 250000, // ₹2,500
        taxRateBps: 1800, // 18% GST
        isActive: true
      },
      {
        tenantId: masterTenant.id,
        name: 'Annual Enterprise Fitness',
        durationType: 'MONTHS',
        durationValue: 12,
        priceInPaise: 2000000, // ₹20,000
        taxRateBps: 1800, // 18% GST
        isActive: true
      }
    ]
  });

  console.log('\n======================================================');
  console.log('DATABASE PURGE COMPLETE - CLEAN STATE READY FOR TESTING:');
  console.log('1. Super Admin: superadmin@fitnexa.com | SuperAdmin@2026');
  console.log('2. Single Gym Company: ' + masterTenant.name + ' (' + masterTenant.slug + ')');
  console.log('3. Gym Owner: toshak10243@gmail.com | Password@2026');
  console.log('4. Single Branch: ' + mainBranch.name);
  console.log('5. Members: 0 (All fake members wiped)');
  console.log('6. Invoices: 0 | Payments: 0 | Attendances: 0');
  console.log('7. Products: 0 | Leads: 0 | Expenses: 0');
  console.log('8. Staff: 0 (Only Toshak as Owner - add your team anytime!)');
  console.log('======================================================');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
