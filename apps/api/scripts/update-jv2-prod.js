#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function main() {
  // Ensure we use Railway's DATABASE_URL, not the local .env
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    const updated = await prisma.directStream.update({
      where: { slug: 'tchs/soccer-20260120-jv2' },
      data: { 
        streamUrl: 'https://stream.mux.com/Ggk02HBjBNdeuKcQXetOoQ4SIP73jswkPCduDPKqwEYg.m3u8' 
      },
      select: { slug: true, title: true, streamUrl: true }
    });
    
    console.log('✅ Stream URL updated in PRODUCTION!');
    console.log('   Slug:', updated.slug);
    console.log('   Title:', updated.title);
    console.log('   Stream URL:', updated.streamUrl);
    console.log('\n📺 Test at: https://fieldview.live/direct/' + updated.slug);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
