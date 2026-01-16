#!/usr/bin/env tsx
/**
 * Update Stream URL for soccer-20260116-jv
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating stream URL for soccer-20260116-jv...\n');

  // Find the parent stream
  const parent = await prisma.directStream.findUnique({
    where: { slug: 'tchs' },
    select: { id: true }
  });

  if (!parent) {
    throw new Error('Parent stream "tchs" not found');
  }

  // Update the event
  const updated = await prisma.directStreamEvent.update({
    where: {
      directStreamId_eventSlug: {
        directStreamId: parent.id,
        eventSlug: 'soccer-20260116-jv'
      }
    },
    data: {
      streamUrl: 'https://stream.mux.com/9b8FqDtpFAnkUvQUhVNrs00Kq00icRnOqmL7LELXPOUKk.m3u8',
      scoreboardHomeTeam: 'Twin Cities',
      scoreboardAwayTeam: 'Opponent',
      scoreboardHomeColor: '#1E3A8A',
      scoreboardAwayColor: '#DC2626',
    }
  });

  console.log('✅ Updated event:');
  console.log(`   Event: ${updated.eventSlug}`);
  console.log(`   Stream URL: ${updated.streamUrl}`);
  console.log(`   Scoreboard: ${updated.scoreboardHomeTeam} vs ${updated.scoreboardAwayTeam}`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
