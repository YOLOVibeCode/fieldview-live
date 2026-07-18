const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateProduction() {
  try {
    console.log('🚀 Updating TCHS JV2 stream URL in PRODUCTION...\n');
    
    const updated = await prisma.directStream.update({
      where: { slug: 'tchs/soccer-20260120-jv2' },
      data: { 
        streamUrl: 'https://stream.mux.com/Ggk02HBjBNdeuKcQXetOoQ4SIP73jswkPCduDPKqwEYg.m3u8'
      },
      select: { slug: true, title: true, streamUrl: true }
    });
    
    console.log('✅ PRODUCTION stream URL updated!');
    console.log('   Slug:', updated.slug);
    console.log('   Title:', updated.title);
    console.log('   Stream URL:', updated.streamUrl);
    console.log('\n📺 Live at: https://fieldview.live/direct/tchs/soccer-20260120-jv2\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateProduction();
