const { PrismaClient } = require('@prisma/client');

async function updateStreamUrl() {
  const prisma = new PrismaClient();
  
  const streamUrl = 'https://stream.mux.com/Ggk02HBjBNdeuKcQXetOoQ4SIP73jswkPCduDPKqwEYg.m3u8';
  
  try {
    // Update LOCAL database
    const updated = await prisma.directStream.update({
      where: { slug: 'tchs/soccer-20260120-jv2' },
      data: { streamUrl },
      select: { slug: true, title: true, streamUrl: true }
    });
    
    console.log('✅ Stream URL updated successfully!');
    console.log('   Slug:', updated.slug);
    console.log('   Title:', updated.title);
    console.log('   Stream URL:', updated.streamUrl);
    console.log('\n📺 Test at: http://localhost:4300/direct/tchs/soccer-20260120-jv2');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateStreamUrl();
