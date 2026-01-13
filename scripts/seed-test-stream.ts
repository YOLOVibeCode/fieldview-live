#!/usr/bin/env ts-node

/**
 * Seed script for Direct Stream UX testing
 * Creates a test direct stream with all necessary configuration
 */

import { PrismaClient } from '@prisma/client';

// Load environment from .env for API service
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient();

const STREAM_SLUG = 'tchs-basketball-20260110';
const STREAM_TITLE = 'TCHS Varsity Basketball vs Rival HS';
const STREAM_URL = 'https://test.stream.com/tchs-basketball.m3u8';

async function main() {
  console.log('🌱 Seeding test direct stream for UX testing...\n');

  // Get or create owner account
  let ownerAccount = await prisma.ownerAccount.findFirst({
    where: { contactEmail: 'admin@fieldview.live' },
  });

  if (!ownerAccount) {
    console.log('Creating owner account...');
    ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Admin',
        status: 'active',
        contactEmail: 'admin@fieldview.live',
      },
    });
    console.log(`✅ Owner account created: ${ownerAccount.contactEmail}\n`);
  } else {
    console.log(`✅ Owner account exists: ${ownerAccount.contactEmail}\n`);
  }

  // Check if stream already exists
  let stream = await prisma.directStream.findUnique({
    where: { slug: STREAM_SLUG },
  });

  if (stream) {
    console.log(`⚠️  Stream already exists: ${STREAM_SLUG}`);
    console.log('Deleting existing stream and related data...\n');

    // Delete related data first (cascade)
    if (stream.gameId) {
      await prisma.gameChatMessage.deleteMany({
        where: { gameId: stream.gameId },
      });
      await prisma.game.delete({
        where: { id: stream.gameId },
      });
    }

    await prisma.directStreamRegistration.deleteMany({
      where: { directStreamId: stream.id },
    });

    await prisma.directStream.delete({
      where: { id: stream.id },
    });

    console.log('✅ Existing stream deleted\n');
  }

  // Create a Game entity for chat/scoreboard
  console.log('Creating Game entity for chat/scoreboard...');
  const game = await prisma.game.create({
    data: {
      title: `Direct Stream: ${STREAM_SLUG}`,
      homeTeam: 'TCHS Eagles',
      awayTeam: 'Rival Rockets',
      ownerAccountId: ownerAccount.id,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      state: 'live',
      priceCents: 0,
      currency: 'USD',
      keywordCode: `TCHS${Date.now().toString().slice(-6)}`,
      qrUrl: `https://fieldview.live/direct/${STREAM_SLUG}`,
      streamSourceId: null,
    },
  });
  console.log(`✅ Game created: ${game.id}\n`);

  // Create the direct stream
  console.log('Creating direct stream...');
  stream = await prisma.directStream.create({
    data: {
      slug: STREAM_SLUG,
      title: STREAM_TITLE,
      ownerAccountId: ownerAccount.id,
      streamUrl: STREAM_URL,
      scheduledStartAt: new Date(),
      adminPassword: 'test123', // Password for admin access
      chatEnabled: true,
      scoreboardEnabled: true,
      gameId: game.id,
    },
  });
  console.log(`✅ Direct stream created: ${stream.slug}\n`);

  // Create scoreboard for the stream
  console.log('Creating scoreboard...');
  const scoreboard = await prisma.gameScoreboard.create({
    data: {
      directStreamId: stream.id,
      homeTeamName: 'TCHS Eagles',
      awayTeamName: 'Rival Rockets',
      homeJerseyColor: '#1e3a8a',
      awayJerseyColor: '#dc2626',
      homeScore: 0,
      awayScore: 0,
    },
  });
  console.log(`✅ Scoreboard created\n`);

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('🎉 Test stream ready for UX testing!');
  console.log('═══════════════════════════════════════════');
  console.log(`Stream URL: http://localhost:4300/direct/${STREAM_SLUG}`);
  console.log(`Admin URL: http://localhost:4300/admin/direct-streams/${stream.id}`);
  console.log(`\nStream Details:`);
  console.log(`  - Slug: ${stream.slug}`);
  console.log(`  - Title: ${stream.title}`);
  console.log(`  - Chat Enabled: ${stream.chatEnabled}`);
  console.log(`  - Scoreboard Enabled: ${stream.scoreboardEnabled}`);
  console.log(`  - Game ID: ${game.id}`);
  console.log(`\nTest Viewers:`);
  console.log(`  - Parent: parent@example.com (Sarah Johnson)`);
  console.log(`  - Alumni: alumni@example.com (Mike Chen)`);
  console.log(`  - Student: student@example.com (Emma Smith)`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding test stream:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

