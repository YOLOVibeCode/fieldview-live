#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../apps/api/.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSoccerEvents() {
  console.log('⚽ Seeding TCHS Soccer Events for January 13, 2026...\n');

  try {
    // Find the TCHS direct stream
    const tchsStream = await prisma.directStream.findUnique({
      where: { slug: 'tchs' }
    });

    if (!tchsStream) {
      console.error('❌ TCHS stream not found! Please seed direct streams first.');
      return;
    }

    console.log(`✓ Found TCHS stream (ID: ${tchsStream.id})\n`);

    // Define the three soccer events
    const events = [
      {
        eventSlug: 'soccer-20260113-jv2',
        title: 'TCHS Soccer - JV2 vs TBA',
        scheduledStartAt: new Date('2026-01-13T16:30:00-06:00'), // 4:30 PM CST
      },
      {
        eventSlug: 'soccer-20260113-jv',
        title: 'TCHS Soccer - JV vs TBA',
        scheduledStartAt: new Date('2026-01-13T18:00:00-06:00'), // 6:00 PM CST
      },
      {
        eventSlug: 'soccer-20260113-varsity',
        title: 'TCHS Soccer - Varsity vs TBA',
        scheduledStartAt: new Date('2026-01-13T19:30:00-06:00'), // 7:30 PM CST
      },
    ];

    // Create or update each event
    for (const eventData of events) {
      const existing = await prisma.directStreamEvent.findFirst({
        where: {
          directStreamId: tchsStream.id,
          eventSlug: eventData.eventSlug,
        },
      });

      if (existing) {
        console.log(`⚠️  Event ${eventData.eventSlug} already exists, skipping...`);
        continue;
      }

      const created = await prisma.directStreamEvent.create({
        data: {
          ...eventData,
          directStreamId: tchsStream.id,
          chatEnabled: true,
          scoreboardEnabled: true,
          scoreboardHomeTeam: 'Twin Cities',
          scoreboardAwayTeam: 'TBA',
          scoreboardHomeColor: '#1E3A8A',
          scoreboardAwayColor: '#DC2626',
          allowAnonymousView: true,
        },
      });

      const time = created.scheduledStartAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      console.log(`✅ Created: ${created.eventSlug}`);
      console.log(`   ${created.title} - ${time}`);
      console.log(`   http://localhost:4300/direct/tchs/${created.eventSlug}\n`);
    }

    console.log('🎉 Successfully seeded soccer events!');

  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSoccerEvents();

