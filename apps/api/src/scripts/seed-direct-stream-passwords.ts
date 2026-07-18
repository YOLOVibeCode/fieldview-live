/**
 * Seed DirectStream Admin Passwords
 * 
 * One-time script to hash passwords from environment variables and store in database.
 * Run locally: tsx src/scripts/seed-direct-stream-passwords.ts
 * Run on Railway: Add as a one-time job
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function seedPasswords() {
  try {
    // Find all DirectStream records
    const streams = await prisma.directStream.findMany({
      select: { id: true, slug: true, adminPassword: true },
    });

    logger.info(`Found ${streams.length} DirectStream records`);

    for (const stream of streams) {
      // Get password from environment variable
      const envSlug = stream.slug.toUpperCase().replace(/-/g, '_');
      const envKey = `DIRECT_${envSlug}_ADMIN_PASSWORD`;
      const envPassword = process.env[envKey] || process.env.DIRECT_ADMIN_PASSWORD || 'admin2026';

      // Check if password is already hashed (starts with $2b$ or $2a$)
      const isAlreadyHashed = stream.adminPassword.startsWith('$2b$') || stream.adminPassword.startsWith('$2a$');

      if (isAlreadyHashed) {
        // Try to verify if it matches the env password
        const matches = await bcrypt.compare(envPassword, stream.adminPassword);
        if (matches) {
          logger.info({ slug: stream.slug }, 'Password already hashed and matches env var');
          continue;
        }
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(envPassword, 10);

      // Update the database
      await prisma.directStream.update({
        where: { id: stream.id },
        data: { adminPassword: hashedPassword },
      });

      logger.info({ slug: stream.slug, envKey }, 'Password hashed and stored');
    }

    logger.info('✅ All DirectStream passwords seeded successfully');
  } catch (error) {
    logger.error({ error }, '❌ Failed to seed passwords');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

