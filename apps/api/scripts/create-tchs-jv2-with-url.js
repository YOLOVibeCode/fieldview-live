// This script should be run ON THE RAILWAY SERVER
// Upload to Railway and run as a job, or via Railway shell

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createTCHSStreamsProduction() {
  const prisma = new PrismaClient();
  
  console.log('🚀 Creating TCHS Soccer streams in PRODUCTION...\n');
  
  try {
    // Find owner
    const owner = await prisma.ownerAccount.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    if (!owner) {
      console.error('❌ No owner found');
      process.exit(1);
    }
    
    console.log(`✅ Using owner: ${owner.name}\n`);
    
    // Create JV2 stream
    const jv2 = await prisma.directStream.upsert({
      where: { slug: 'tchs/soccer-20260120-jv2' },
      create: {
        slug: 'tchs/soccer-20260120-jv2',
        title: 'TCHS Soccer JV2 - January 20, 2026',
        streamUrl: 'https://stream.mux.com/Ggk02HBjBNdeuKcQXetOoQ4SIP73jswkPCduDPKqwEYg.m3u8',
        ownerAccount: { connect: { id: owner.id } },
        adminPassword: await bcrypt.hash('tchs2026', 10),
        chatEnabled: true,
        paywallEnabled: false,
        priceInCents: 0,
        scoreboardEnabled: true,
      },
      update: {
        streamUrl: 'https://stream.mux.com/Ggk02HBjBNdeuKcQXetOoQ4SIP73jswkPCduDPKqwEYg.m3u8',
        scoreboardEnabled: true,
      },
    });
    
    // Create scoreboard
    await prisma.gameScoreboard.upsert({
      where: { directStreamId: jv2.id },
      create: {
        directStreamId: jv2.id,
        homeTeamName: 'TCHS JV2',
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
      update: { homeTeamName: 'TCHS JV2' },
    });
    
    console.log('✅ Created: tchs/soccer-20260120-jv2');
    console.log('   Stream URL:', jv2.streamUrl);
    console.log('\n📺 Live at: https://fieldview.live/direct/tchs/soccer-20260120-jv2\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTCHSStreamsProduction();
