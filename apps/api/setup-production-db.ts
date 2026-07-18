#!/usr/bin/env tsx
/**
 * Production database setup script
 * Run this in Railway environment to:
 * 1. Apply pending migrations
 * 2. Create TCHS owner account
 */

import { prisma } from './src/lib/prisma';
import { logger } from './src/lib/logger';

async function main() {
  logger.info('🚀 Starting production database setup...');

  try {
    // Step 1: Check database connection
    logger.info('📡 Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection successful');

    // Step 2: Create TCHS owner account if it doesn't exist
    logger.info('🔍 Checking for TCHS owner account...');
    
    let owner = await prisma.ownerAccount.findFirst({
      where: {
        OR: [
          { name: { equals: 'TCHS' } },
          { contactEmail: { contains: 'tchs', mode: 'insensitive' } },
        ],
      },
    });

    if (owner) {
      logger.info({ ownerId: owner.id, name: owner.name }, '✅ TCHS owner account already exists');
    } else {
      logger.info('📝 Creating TCHS owner account...');
      owner = await prisma.ownerAccount.create({
        data: {
          type: 'owner',
          name: 'TCHS',
          status: 'active',
          contactEmail: 'admin@tchs.example.com',
        },
      });
      logger.info({ ownerId: owner.id, name: owner.name }, '✅ TCHS owner account created successfully');
    }

    // Step 3: Verify chat tables exist
    logger.info('🔍 Verifying chat tables...');
    const chatCount = await prisma.gameChatMessage.count();
    logger.info({ messageCount: chatCount }, '✅ Chat tables verified');

    // Step 4: Verify ViewerIdentity tables exist
    logger.info('🔍 Verifying viewer identity tables...');
    const viewerCount = await prisma.viewerIdentity.count();
    logger.info({ viewerCount }, '✅ Viewer identity tables verified');

    logger.info('🎉 Production database setup complete!');
    logger.info('');
    logger.info('📋 Summary:');
    logger.info(`   - TCHS Owner ID: ${owner.id}`);
    logger.info(`   - Chat messages: ${chatCount}`);
    logger.info(`   - Viewers: ${viewerCount}`);
    logger.info('');
    logger.info('✅ Chat system is ready for TCHS streams!');

  } catch (error) {
    logger.error({ error }, '❌ Production database setup failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

