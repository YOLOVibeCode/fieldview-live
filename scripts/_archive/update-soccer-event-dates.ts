#!/usr/bin/env tsx
/**
 * Update TCHS Soccer Event Dates
 * Changes soccer-20260712-* to soccer-20260113-*
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from apps/api
config({ path: resolve(__dirname, '../apps/api/.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateEventDates() {
  console.log('🔄 Updating TCHS soccer event dates from 20260112 to 20260113...\n');

  try {
    // Get existing events
    const oldEvents = await prisma.directStreamEvent.findMany({
      where: {
        eventSlug: {
          startsWith: 'soccer-20260112-'
        }
      },
      orderBy: { scheduledStartAt: 'asc' }
    });

    if (oldEvents.length === 0) {
      console.log('⚠️  No events found with soccer-20260112-* slug pattern');
      return;
    }

    console.log(`Found ${oldEvents.length} events to update:\n`);
    oldEvents.forEach(event => {
      console.log(`  - ${event.eventSlug} (${event.title})`);
    });

    // Update each event
    for (const event of oldEvents) {
      const newSlug = event.eventSlug.replace('soccer-20260112', 'soccer-20260113');
      
      await prisma.directStreamEvent.update({
        where: { id: event.id },
        data: { eventSlug: newSlug }
      });

      console.log(`\n✅ Updated: ${event.eventSlug} → ${newSlug}`);
    }

    // Verify updates
    console.log('\n📋 Verifying updated events:\n');
    const updatedEvents = await prisma.directStreamEvent.findMany({
      where: {
        eventSlug: {
          startsWith: 'soccer-20260113-'
        }
      },
      orderBy: { scheduledStartAt: 'asc' }
    });

    updatedEvents.forEach(event => {
      const time = event.scheduledStartAt?.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: 'short'
      });
      console.log(`  ✓ ${event.eventSlug}`);
      console.log(`    ${event.title} - ${time}`);
    });

    console.log(`\n🎉 Successfully updated ${updatedEvents.length} events!`);
    console.log('\n📍 New URLs:');
    updatedEvents.forEach(event => {
      console.log(`  https://fieldview.live/direct/tchs/${event.eventSlug}`);
    });

  } catch (error) {
    console.error('❌ Error updating events:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateEventDates();

