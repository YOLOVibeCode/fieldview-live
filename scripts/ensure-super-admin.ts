/**
 * Ensure super_admin (admin@fieldview.live) exists in the database.
 * Uses DATABASE_URL; password from ADMIN_PASSWORD env (min 8 chars).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." ADMIN_PASSWORD="yourpassword" pnpm exec tsx scripts/ensure-super-admin.ts
 *   (for local, use your local DATABASE_URL from .env)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@fieldview.live';

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.error('Set ADMIN_PASSWORD (min 8 characters) and run again.');
    process.exit(1);
  }

  const existing = await prisma.adminAccount.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.adminAccount.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash },
    });
    console.log('Super admin password updated:', existing.email);
    process.exit(0);
  }

  await prisma.adminAccount.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'super_admin',
      status: 'active',
      mfaEnabled: false,
    },
  });

  console.log('Super admin created:', ADMIN_EMAIL);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
