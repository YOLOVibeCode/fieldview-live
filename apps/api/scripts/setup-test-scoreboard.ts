/**
 * Setup Test Environment for Scoreboard E2E Tests
 * 
 * Ensures stormfc stream is properly configured:
 * - No paywall
 * - Scoreboard enabled
 * - Viewer editing enabled
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment for scoreboard tests...\n');

  try {
    // Update stormfc stream
    const stream = await prisma.directStream.update({
      where: { slug: 'stormfc' },
      data: {
        paywallEnabled: false,
        priceInCents: 0,
        paywallMessage: null,
        scoreboardEnabled: true, // Enable scoreboard
      },
    });

    console.log('✅ Stream configured:');
    console.log(`   Slug: ${stream.slug}`);
    console.log(`   Paywall: ${stream.paywallEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Scoreboard: ${stream.scoreboardEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('');

    // Check if scoreboard record exists
    let scoreboard = await prisma.gameScoreboard.findUnique({
      where: { directStreamId: stream.id },
    });

    if (!scoreboard) {
      console.log('📊 Creating scoreboard record...');
      
      scoreboard = await prisma.gameScoreboard.create({
        data: {
          directStreamId: stream.id,
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
          homeScore: 0,
          awayScore: 0,
          homeJerseyColor: '#3B82F6', // Blue
          awayJerseyColor: '#EF4444', // Red
          isVisible: true,
          position: 'top-left',
          clockMode: 'stopped',
          clockSeconds: 0,
          producerPassword: null, // NULL = open editing for anyone
        },
      });

      console.log('✅ Scoreboard created');
    } else {
      console.log('📊 Updating existing scoreboard...');
      
      scoreboard = await prisma.gameScoreboard.update({
        where: { id: scoreboard.id },
        data: {
          isVisible: true,
          producerPassword: null, // NULL = open editing
          homeTeamName: scoreboard.homeTeamName || 'Home Team',
          awayTeamName: scoreboard.awayTeamName || 'Away Team',
          homeJerseyColor: scoreboard.homeJerseyColor || '#3B82F6',
          awayJerseyColor: scoreboard.awayJerseyColor || '#EF4444',
        },
      });

      console.log('✅ Scoreboard updated');
    }

    console.log('');
    console.log('📋 Scoreboard details:');
    console.log(`   Home: ${scoreboard.homeTeamName} (${scoreboard.homeScore})`);
    console.log(`   Away: ${scoreboard.awayTeamName} (${scoreboard.awayScore})`);
    console.log(`   Visible: ${scoreboard.isVisible}`);
    console.log(`   Producer Password: ${scoreboard.producerPassword ? 'SET (protected)' : 'NULL (open editing)'}`);
    console.log('');

    console.log('✅ Test environment ready!');
    console.log('');
    console.log('🚀 Run tests with:');
    console.log('   pnpm --filter web test:live -- scoreboard-automated.spec.ts');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestEnvironment();
