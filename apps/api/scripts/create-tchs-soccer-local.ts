import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Load .env from apps/api directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function createTCHSSoccerStreams() {
  console.log('🏃 Creating TCHS Soccer streams in LOCAL database...\n');

  try {
    // First check if TCHS owner exists
    const owner = await prisma.owner.findUnique({
      where: { slug: 'tchs' },
    });

    if (!owner) {
      console.error('❌ TCHS owner not found! Please create it first.');
      process.exit(1);
    }

    console.log(`✅ Found owner: ${owner.name} (${owner.slug})\n`);

    // Define the three streams
    const streams = [
      {
        slug: 'tchs/soccer-20260120-jv2',
        title: 'TCHS Soccer JV2 - January 20, 2026',
        description: 'Twin City High School Soccer JV2 Team',
        streamUrl: 'https://stream.mux.com/placeholder-jv2.m3u8',
        homeTeamName: 'TCHS JV2',
      },
      {
        slug: 'tchs/soccer-20260120-jv',
        title: 'TCHS Soccer JV - January 20, 2026',
        description: 'Twin City High School Soccer JV Team',
        streamUrl: 'https://stream.mux.com/placeholder-jv.m3u8',
        homeTeamName: 'TCHS JV',
      },
      {
        slug: 'tchs/soccer-20260120-varsity',
        title: 'TCHS Soccer Varsity - January 20, 2026',
        description: 'Twin City High School Soccer Varsity Team',
        streamUrl: 'https://stream.mux.com/placeholder-varsity.m3u8',
        homeTeamName: 'TCHS Varsity',
      },
    ];

    // Create each stream with scoreboard
    for (const streamData of streams) {
      // Upsert DirectStream
      const stream = await prisma.directStream.upsert({
        where: { slug: streamData.slug },
        create: {
          slug: streamData.slug,
          title: streamData.title,
          description: streamData.description,
          streamUrl: streamData.streamUrl,
          ownerId: owner.id,
          chatEnabled: true,
          paywallEnabled: false,
          priceInCents: 0,
          scoreboardEnabled: true,
        },
        update: {
          title: streamData.title,
          description: streamData.description,
          chatEnabled: true,
          scoreboardEnabled: true,
        },
      });

      console.log(`✅ Created/Updated stream: ${stream.slug}`);

      // Upsert GameScoreboard
      const scoreboard = await prisma.gameScoreboard.upsert({
        where: { directStreamId: stream.id },
        create: {
          directStreamId: stream.id,
          homeTeamName: streamData.homeTeamName,
          awayTeamName: 'Away Team',
          homeJerseyColor: '#003366',
          awayJerseyColor: '#CC0000',
          homeScore: 0,
          awayScore: 0,
          clockMode: 'stopped',
          clockSeconds: 0,
          isVisible: true,
          position: 'top',
        },
        update: {
          homeTeamName: streamData.homeTeamName,
          awayTeamName: 'Away Team',
        },
      });

      console.log(`   ✅ Scoreboard created: ${scoreboard.homeTeamName} vs ${scoreboard.awayTeamName}\n`);
    }

    console.log('\n✅ All TCHS Soccer streams created successfully!\n');
    console.log('📍 LOCAL URLs:');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-jv2');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-jv');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-varsity\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTCHSSoccerStreams();
