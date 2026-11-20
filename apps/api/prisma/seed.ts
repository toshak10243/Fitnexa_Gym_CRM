import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = 'superadmin@fitnexa.com';
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash('SuperAdmin@2026', 12);
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        fullName: 'Fitnexa Platform Owner',
        phone: '9999999999',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      },
    });
    console.log(`✓ Super Admin seeded: ${superAdminEmail} / SuperAdmin@2026`);
  } else {
    console.log(`ℹ Super Admin already exists: ${superAdminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
