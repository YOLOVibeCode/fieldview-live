#!/usr/bin/env tsx
/**
 * Fix Missing Game Records for DirectStreams
 * 
 * The viewer unlock endpoint requires a Game record with title "Direct Stream: {slug}"
 * This script creates those records for all DirectStreams that are missing them.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating missing Game records for DirectStreams...\n');

  // Get all DirectStreams
  const directStreams = await prisma.directStream.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      ownerAccountId: true,
    },
  });

  console.log(`Found ${directStreams.length} DirectStream(s)\n`);

  for (const ds of directStreams) {
    const expectedTitle = `Direct Stream: ${ds.slug}`;
    
    // Check if Game exists
    const existingGame = await prisma.game.findFirst({
      where: {
        title: expectedTitle,
      },
    });

    if (existingGame) {
      console.log(`✓ Game already exists: "${expectedTitle}" (ID: ${existingGame.id})`);
      continue;
    }

    // Create the Game record
    const keywordCode = `DS-${ds.slug.toUpperCase()}-${Date.now()}`;
    const game = await prisma.game.create({
      data: {
        title: expectedTitle,
        state: 'active',
        ownerAccountId: ds.ownerAccountId,
        startsAt: new Date(), // Required field
        homeTeam: ds.title || ds.slug, // Use DirectStream title as homeTeam
        awayTeam: 'TBD', // Required field
        priceCents: 0, // Free for direct streams
        keywordCode: keywordCode,
        qrUrl: `https://fieldview.live/direct/${ds.slug}`,
      },
    });

    console.log(`✅ Created Game: "${expectedTitle}" (ID: ${game.id})`);
  }

  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
