/**
 * Seed Script: Add TCHS and Denton Diablos Direct Stream Events
 * 
 * TCHS Events:
 * - /direct/tchs/soccer-20260116-jv2
 * - /direct/tchs/soccer-20260116-jv
 * - /direct/tchs/soccer-20260116-varsity
 * 
 * Denton Diablos Events:
 * - /direct/dentondiablos/soccer-202601161100-texas-warriors
 * - /direct/dentondiablos/soccer-202601161530-avanti-sa-white
 * - /direct/dentondiablos/soccer-202601170930-ntx-united
 * - /direct/dentondiablos/soccer-202601171400-final
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding direct stream events...\n');

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

  // 1. TCHS Stream Events
  console.log('📺 Processing TCHS stream...');
  
  const tchsStream = await prisma.directStream.upsert({
    where: { slug: 'tchs' },
    update: {
      adminPassword: await bcrypt.hash('tchs2026', 10),
    },
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

  // TCHS Events
  const tchsEvents = [
    {
      eventSlug: 'soccer-20260116-jv2',
      title: 'TCHS Soccer - JV2 (Jan 16, 2026)',
      scheduledStartAt: new Date('2026-01-16T16:30:00-06:00'), // 4:30 PM CST
    },
    {
      eventSlug: 'soccer-20260116-jv',
      title: 'TCHS Soccer - JV (Jan 16, 2026)',
      scheduledStartAt: new Date('2026-01-16T18:00:00-06:00'), // 6:00 PM CST
    },
    {
      eventSlug: 'soccer-20260116-varsity',
      title: 'TCHS Soccer - Varsity (Jan 16, 2026)',
      scheduledStartAt: new Date('2026-01-16T19:30:00-06:00'), // 7:30 PM CST
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

  console.log();

  // 2. Denton Diablos Stream Events
  console.log('📺 Processing Denton Diablos stream...');
  
  const dentonDiablosStream = await prisma.directStream.upsert({
    where: { slug: 'dentondiablos' },
    update: {
      adminPassword: await bcrypt.hash('devil2026', 10),
    },
    create: {
      slug: 'dentondiablos',
      title: 'Denton Diablos Live Stream',
      ownerAccountId: ownerAccount.id,
      adminPassword: await bcrypt.hash('devil2026', 10),
      chatEnabled: true,
      scoreboardEnabled: true,
      paywallEnabled: false,
      allowAnonymousView: true,
      sendReminders: true,
    },
  });
  console.log(`✅ Denton Diablos stream: ${dentonDiablosStream.slug} (ID: ${dentonDiablosStream.id})`);

  // Denton Diablos Events
  const dentonEvents = [
    {
      eventSlug: 'soccer-202601161100-texas-warriors',
      title: 'Denton Diablos vs Texas Warriors (Jan 16, 11:00 AM)',
      scheduledStartAt: new Date('2026-01-16T11:00:00-06:00'), // 11:00 AM CST
    },
    {
      eventSlug: 'soccer-202601161530-avanti-sa-white',
      title: 'Denton Diablos vs Avanti SA White (Jan 16, 3:30 PM)',
      scheduledStartAt: new Date('2026-01-16T15:30:00-06:00'), // 3:30 PM CST
    },
    {
      eventSlug: 'soccer-202601170930-ntx-united',
      title: 'Denton Diablos vs NTX United (Jan 17, 9:30 AM)',
      scheduledStartAt: new Date('2026-01-17T09:30:00-06:00'), // 9:30 AM CST
    },
    {
      eventSlug: 'soccer-202601171400-final',
      title: 'Denton Diablos - Tournament Final (Jan 17, 2:00 PM)',
      scheduledStartAt: new Date('2026-01-17T14:00:00-06:00'), // 2:00 PM CST
    },
  ];

  for (const event of dentonEvents) {
    const created = await prisma.directStreamEvent.upsert({
      where: {
        directStreamId_eventSlug: {
          directStreamId: dentonDiablosStream.id,
          eventSlug: event.eventSlug,
        },
      },
      update: {
        title: event.title,
        scheduledStartAt: event.scheduledStartAt,
      },
      create: {
        directStreamId: dentonDiablosStream.id,
        eventSlug: event.eventSlug,
        title: event.title,
        scheduledStartAt: event.scheduledStartAt,
        chatEnabled: true,
        scoreboardEnabled: true,
      },
    });
    console.log(`  ✅ Created: /direct/dentondiablos/${created.eventSlug}`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('📋 Summary:');
  console.log('  TCHS: 3 events');
  console.log('  Denton Diablos: 4 events');
  console.log('\n🔑 Admin Passwords:');
  console.log('  TCHS: tchs2026');
  console.log('  Denton Diablos: devil2026');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

