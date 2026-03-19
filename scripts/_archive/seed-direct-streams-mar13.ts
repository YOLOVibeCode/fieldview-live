/**
 * Seed Script: Add TCHS Direct Stream Events for March 13, 2026
 *
 * TCHS Events:
 * - https://fieldview.live/direct/tchs/soccer-20260313-jv2
 * - https://fieldview.live/direct/tchs/soccer-20260313-jv
 * - https://fieldview.live/direct/tchs/soccer-20260313-varsity
 *
 * Usage:
 *   Local:      DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams-mar13.ts
 *   Production: DATABASE_URL="..." pnpm exec tsx scripts/seed-direct-streams-mar13.ts
 *   Or call API: POST https://api.fieldview.live/api/admin/seed/tchs-mar13 (after deploy)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TCHS March 13 direct stream events...\n');

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

  const tchsEvents = [
    {
      eventSlug: 'soccer-20260313-jv2',
      title: 'TCHS Soccer - JV2 (Mar 13, 2026)',
      scheduledStartAt: new Date('2026-03-13T16:30:00-05:00'),
    },
    {
      eventSlug: 'soccer-20260313-jv',
      title: 'TCHS Soccer - JV (Mar 13, 2026)',
      scheduledStartAt: new Date('2026-03-13T18:00:00-05:00'),
    },
    {
      eventSlug: 'soccer-20260313-varsity',
      title: 'TCHS Soccer - Varsity (Mar 13, 2026)',
      scheduledStartAt: new Date('2026-03-13T19:30:00-05:00'),
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

  console.log('\n✅ Seeding complete!\n');
  console.log('📋 Summary:');
  console.log('  TCHS March 13: 3 events');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260313-jv2');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260313-jv');
  console.log('    - https://fieldview.live/direct/tchs/soccer-20260313-varsity');
  console.log('\n🔑 Admin Password: tchs2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
