/**
 * Seed DirectStreams - Populate database with existing direct links
 * 
 * Usage:
 *   Local:      DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams.ts
 *   Production: DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams.ts --production
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isProduction = process.argv.includes('--production');

// Seed data for existing DirectStreams
const directStreams = [
  {
    slug: 'tchs',
    title: 'TCHS Live Stream',
    streamUrl: null, // Will be set dynamically
    scheduledStartAt: null,
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'tchs2026', // Will be hashed
    chatEnabled: true,
    scoreboardEnabled: true,
    allowAnonymousView: true,
    requireEmailVerification: true,
    listed: true,
    sendReminders: true,
    reminderMinutes: 5,
    scoreboardHomeTeam: null,
    scoreboardAwayTeam: null,
    scoreboardHomeColor: null,
    scoreboardAwayColor: null,
  },
  // Add more streams as needed
];

async function seedDirectStreams() {
  console.log('🌱 Seeding DirectStreams...');
  console.log(`Environment: ${isProduction ? '🔴 PRODUCTION' : '🟢 LOCAL'}`);
  console.log('');

  // Get default owner account
  const defaultOwner = await prisma.ownerAccount.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!defaultOwner) {
    console.error('❌ Error: No OwnerAccount found. Please create one first.');
    process.exit(1);
  }

  console.log(`✅ Using OwnerAccount: ${defaultOwner.name} (${defaultOwner.contactEmail})`);
  console.log('');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const streamData of directStreams) {
    try {
      // Check if stream exists
      const existing = await prisma.directStream.findUnique({
        where: { slug: streamData.slug },
      });

      // Hash password
      const adminPasswordHash = await bcrypt.hash(streamData.adminPassword, 10);

      if (existing) {
        // Update existing stream
        await prisma.directStream.update({
          where: { slug: streamData.slug },
          data: {
            title: streamData.title,
            chatEnabled: streamData.chatEnabled,
            scoreboardEnabled: streamData.scoreboardEnabled,
            allowAnonymousView: streamData.allowAnonymousView,
            requireEmailVerification: streamData.requireEmailVerification,
            listed: streamData.listed,
            adminPassword: adminPasswordHash, // Update password
          },
        });
        console.log(`🔄 Updated: ${streamData.slug} - ${streamData.title}`);
        updated++;
      } else {
        // Create new stream
        await prisma.directStream.create({
          data: {
            slug: streamData.slug,
            title: streamData.title,
            streamUrl: streamData.streamUrl,
            scheduledStartAt: streamData.scheduledStartAt,
            paywallEnabled: streamData.paywallEnabled,
            priceInCents: streamData.priceInCents,
            paywallMessage: streamData.paywallMessage,
            allowSavePayment: streamData.allowSavePayment,
            adminPassword: adminPasswordHash,
            chatEnabled: streamData.chatEnabled,
            scoreboardEnabled: streamData.scoreboardEnabled,
            allowAnonymousView: streamData.allowAnonymousView,
            requireEmailVerification: streamData.requireEmailVerification,
            listed: streamData.listed,
            sendReminders: streamData.sendReminders,
            reminderMinutes: streamData.reminderMinutes,
            scoreboardHomeTeam: streamData.scoreboardHomeTeam,
            scoreboardAwayTeam: streamData.scoreboardAwayTeam,
            scoreboardHomeColor: streamData.scoreboardHomeColor,
            scoreboardAwayColor: streamData.scoreboardAwayColor,
            ownerAccountId: defaultOwner.id,
          },
        });
        console.log(`✅ Created: ${streamData.slug} - ${streamData.title}`);
        created++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${streamData.slug}:`, error.message);
      skipped++;
    }
  }

  console.log('');
  console.log('📊 Seed Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${created + updated + skipped}`);
  console.log('');
  console.log('✅ Seeding complete!');
}

async function main() {
  try {
    await seedDirectStreams();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

