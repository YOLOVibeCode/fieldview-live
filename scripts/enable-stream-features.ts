#!/usr/bin/env ts-node
/**
 * Enable Chat & Scoreboard Features
 * 
 * This script enables chat and scoreboard features for all active direct streams.
 * Run this after adding new streams or when features were initially disabled.
 * 
 * Usage:
 *   LOCAL:      pnpm tsx scripts/enable-stream-features.ts
 *   PRODUCTION: DATABASE_URL="<prod-url>" pnpm tsx scripts/enable-stream-features.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableStreamFeatures() {
  console.log('🚀 Enabling chat and scoreboard features for active streams...\n');

  try {
    // Enable features for TCHS main stream
    const tchsResult = await prisma.directStream.update({
      where: { slug: 'tchs' },
      data: {
        chatEnabled: true,
        scoreboardEnabled: true,
        scoreboardHomeTeam: 'Twin Cities',
        scoreboardAwayTeam: 'Opponent',
        scoreboardHomeColor: '#1E3A8A',
        scoreboardAwayColor: '#DC2626',
      },
    });
    console.log(`✅ Updated TCHS stream:`, {
      slug: tchsResult.slug,
      chatEnabled: tchsResult.chatEnabled,
      scoreboardEnabled: tchsResult.scoreboardEnabled,
    });

    // Enable features for StormFC main stream  
    try {
      const stormfcResult = await prisma.directStream.update({
        where: { slug: 'stormfc' },
        data: {
          chatEnabled: true,
          scoreboardEnabled: true,
          scoreboardHomeTeam: 'Storm FC',
          scoreboardAwayTeam: 'Opponent',
          scoreboardHomeColor: '#1E40AF',
          scoreboardAwayColor: '#DC2626',
        },
      });
      console.log(`✅ Updated StormFC stream:`, {
        slug: stormfcResult.slug,
        chatEnabled: stormfcResult.chatEnabled,
        scoreboardEnabled: stormfcResult.scoreboardEnabled,
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        console.log('⚠️  StormFC stream not found (skipping)');
      } else {
        throw err;
      }
    }

    // Enable features for TCHS soccer sub-events
    const eventsResult = await prisma.directStreamEvent.updateMany({
      where: {
        eventSlug: {
          in: ['soccer-20260112-jv2', 'soccer-20260112-jv', 'soccer-20260112-varsity'],
        },
      },
      data: {
        chatEnabled: true,
        scoreboardEnabled: true,
        scoreboardHomeTeam: 'TCHS',
        scoreboardAwayTeam: 'Opponent',
        scoreboardHomeColor: '#1E3A8A',
        scoreboardAwayColor: '#DC2626',
      },
    });
    console.log(`✅ Updated ${eventsResult.count} TCHS soccer events`);

    // Enable for any other active streams that don't have features enabled
    const catchAllResult = await prisma.directStream.updateMany({
      where: {
        status: 'active',
        OR: [
          { chatEnabled: null },
          { chatEnabled: false },
          { scoreboardEnabled: null },
          { scoreboardEnabled: false },
        ],
      },
      data: {
        chatEnabled: true,
        scoreboardEnabled: true,
      },
    });
    console.log(`✅ Updated ${catchAllResult.count} additional streams\n`);

    // Verify results
    const allStreams = await prisma.directStream.findMany({
      where: { status: 'active' },
      select: {
        slug: true,
        chatEnabled: true,
        scoreboardEnabled: true,
        scoreboardHomeTeam: true,
        scoreboardAwayTeam: true,
      },
      orderBy: { slug: 'asc' },
    });

    console.log('📊 Current stream configuration:');
    console.table(allStreams);

    console.log('\n✨ Done! All active streams now have chat and scoreboard enabled.');
  } catch (error) {
    console.error('\n❌ Error enabling features:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
enableStreamFeatures();

