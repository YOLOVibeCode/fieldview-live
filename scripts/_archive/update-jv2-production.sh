#!/bin/bash
# Update TCHS JV2 stream URL in PRODUCTION database via Railway

echo "🚀 Updating TCHS JV2 stream URL in PRODUCTION..."

railway run --service api "node -e \"
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  try {
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
    console.log('   Stream URL:', updated.streamUrl.substring(0, 60) + '...');
    console.log('\\n📺 Live at: https://fieldview.live/direct/tchs/soccer-20260120-jv2');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.\\\$disconnect();
  }
})();
\""

echo ""
echo "✅ Done! Stream is now live on production."
