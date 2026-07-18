#!/usr/bin/env tsx
/**
 * Update Varsity Stream URL to Live Stream
 * 
 * Updates soccer-20260116-varsity with the correct live Mux stream URL
 */

import { prisma } from '../packages/data-model/src/index.js';

async function main() {
  console.log('🔧 Updating Varsity stream URL to live stream...\n');

  const newStreamUrl = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8';

  // Find the parent stream
  const parent = await prisma.directStream.findUnique({
    where: { slug: 'tchs' },
    select: { id: true, slug: true }
  });

  if (!parent) {
    throw new Error('Parent stream "tchs" not found');
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
    throw new Error('Event "soccer-20260116-varsity" not found');
  }

  console.log(`Current streamUrl: ${event.streamUrl}\n`);
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
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
