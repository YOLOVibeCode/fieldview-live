/**
 * Seed Script: Add TCHS Direct Stream Events for March 9, 2026
 *
 * TCHS Events:
 * - /direct/tchs/soccer-20260309-jv2
 * - /direct/tchs/soccer-20260309-jv
 * - /direct/tchs/soccer-20260309-varsity
 *
 * Usage:
 *   Local:      DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams-mar09.ts
 *   Production: DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams-mar09.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TCHS March 9 direct stream events...\n');

  // Get or create owner account
  let ownerAccount = await prisma.ownerAccount.findFirst();
  if (!ownerAccount) {
    console.log('Creating default owner account...');
    ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'System Owner',
        status: 'active',
        contactEmail: 'owner@fieldview.live',
      },
    });
  }
  console.log(`Using owner account: ${ownerAccount.name} (ID: ${ownerAccount.id})\n`);

  // TCHS Parent Stream (upsert - likely already exists)
  console.log('📺 Processing TCHS stream...');

  const tchsStream = await prisma.directStream.upsert({
    where: { slug: 'tchs' },
    update: {},
    create: {
      slug: 'tchs',
      title: 'TCHS Live Stream',
      ownerAccountId: ownerAccount.id,
      adminPassword: await bcrypt.hash('tchs2026', 10),
      chatEnabled: true,
      scoreboardEnabled: true,
      paywallEnabled: false,
      allowAnonymousView: true,
      sendReminders: true,
    },
  });
  console.log(`✅ TCHS stream: ${tchsStream.slug} (ID: ${tchsStream.id})`);

  // TCHS Events for March 9, 2026
  const tchsEvents = [
    {
      eventSlug: 'soccer-20260309-jv2',
      title: 'TCHS Soccer - JV2 (Mar 9, 2026)',
      scheduledStartAt: new Date('2026-03-09T16:30:00-05:00'), // 4:30 PM CST
    },
    {
      eventSlug: 'soccer-20260309-jv',
      title: 'TCHS Soccer - JV (Mar 9, 2026)',
      scheduledStartAt: new Date('2026-03-09T18:00:00-05:00'), // 6:00 PM CST
    },
    {
      eventSlug: 'soccer-20260309-varsity',
      title: 'TCHS Soccer - Varsity (Mar 9, 2026)',
      scheduledStartAt: new Date('2026-03-09T19:30:00-05:00'), // 7:30 PM CST
    },
  ];

  for (const event of tchsEvents) {
    const created = await prisma.directStreamEvent.upsert({
      where: {
        directStreamId_eventSlug: {
          directStreamId: tchsStream.id,
          eventSlug: event.eventSlug,
        },
      },
      update: {
        title: event.title,
        scheduledStartAt: event.scheduledStartAt,
      },
      create: {
        directStreamId: tchsStream.id,
        eventSlug: event.eventSlug,
        title: event.title,
        scheduledStartAt: event.scheduledStartAt,
        chatEnabled: true,
        scoreboardEnabled: true,
      },
    });
    console.log(`  ✅ Created: /direct/tchs/${created.eventSlug}`);
  }

  // Clean up stale standalone stream auto-created by earlier bootstrap hit
  const stale = await prisma.directStream.findUnique({ where: { slug: 'tchs/soccer-20260309-jv2' } });
  if (stale) {
    if (stale.gameId) {
      await prisma.game.delete({ where: { id: stale.gameId } }).catch(() => {});
    }
    await prisma.directStream.delete({ where: { slug: 'tchs/soccer-20260309-jv2' } });
    console.log('  🧹 Cleaned up stale standalone stream: tchs/soccer-20260309-jv2');
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('📋 Summary:');
  console.log('  TCHS March 9: 3 events');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260309-jv2');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260309-jv');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260309-varsity');
  console.log('\n🔑 Admin Password: tchs2026');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
