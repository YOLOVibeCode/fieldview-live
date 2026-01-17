#!/usr/bin/env node
/**
 * Update Varsity Stream URL - Simple Node.js script for Railway
 * 
 * Usage: railway run --service api -- node scripts/update-varsity-stream-url-simple.js
 */

const { PrismaClient } = require('../node_modules/.pnpm/@prisma+client@6.0.0_prisma@6.0.0/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating Varsity stream URL to live stream...\n');

  const newStreamUrl = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8';

  // Find the parent stream
  const parent = await prisma.directStream.findUnique({
    where: { slug: 'tchs' },
    select: { id: true, slug: true }
  });

  if (!parent) {
    console.error('❌ Parent stream "tchs" not found!');
    process.exit(1);
  }

  console.log(`✓ Found parent stream: ${parent.slug} (ID: ${parent.id})\n`);

  // Find the Varsity event
  const event = await prisma.directStreamEvent.findFirst({
    where: {
      eventSlug: 'soccer-20260116-varsity',
      directStreamId: parent.id
    },
    select: {
      id: true,
      eventSlug: true,
      streamUrl: true
    }
  });

  if (!event) {
    console.error('❌ Event "soccer-20260116-varsity" not found!');
    process.exit(1);
  }

  console.log(`Current streamUrl: ${event.streamUrl || '(null)'}\n`);
  console.log(`New streamUrl:     ${newStreamUrl}\n`);

  // Update the event
  const updated = await prisma.directStreamEvent.update({
    where: { id: event.id },
    data: {
      streamUrl: newStreamUrl
    }
  });

  console.log(`✅ Updated event: ${updated.eventSlug}`);
  console.log(`   New streamUrl: ${updated.streamUrl}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
