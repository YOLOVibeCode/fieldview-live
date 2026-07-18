/**
 * Set Password Script
 *
 * Sets password for a user account (OwnerUser or AdminAccount).
 * Usage: pnpm --filter=api exec tsx apps/api/scripts/set-password.ts <email> <password>
 */

import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function setPassword(email: string, password: string) {
  console.log(`Setting password for ${email}...`);

  // Try OwnerUser first
  const ownerUser = await prisma.ownerUser.findUnique({
    where: { email },
  });

  if (ownerUser) {
    const hashedPassword = await bcryptjs.hash(password, 10);
    await prisma.ownerUser.update({
      where: { id: ownerUser.id },
      data: { passwordHash: hashedPassword },
    });
    console.log(`✓ Password updated for OwnerUser: ${email}`);
    return;
  }

  // Try AdminAccount
  const adminAccount = await prisma.adminAccount.findUnique({
    where: { email },
  });

  if (adminAccount) {
    const hashedPassword = await bcryptjs.hash(password, 10);
    await prisma.adminAccount.update({
      where: { id: adminAccount.id },
      data: { passwordHash: hashedPassword },
    });
    console.log(`✓ Password updated for AdminAccount: ${email}`);
    return;
  }

  console.error(`✗ User not found: ${email}`);
  process.exit(1);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: tsx set-password.ts <email> <password>');
    process.exit(1);
  }

  try {
    await setPassword(email, password);
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();

