#!/usr/bin/env tsx
/**
 * Fix Stream URL Typo
 * 
 * Fixes the "ahttps://" typo in stream URLs to "https://"
 * 
 * Usage:
 *   railway run --service api -- npx tsx scripts/fix-streamurl-typo.ts
 */

import { prisma } from '../packages/data-model/src/index.js';

async function main() {
  console.log('🔍 Searching for stream URLs with "ahttps://" typo...\n');

  // Fix DirectStream parent streams
  const parentStreams = await prisma.directStream.findMany({
    where: {
      streamUrl: {
        startsWith: 'ahttps://'
      }
    },
    select: {
      id: true,
      slug: true,
      streamUrl: true
    }
  });

  console.log(`Found ${parentStreams.length} parent streams with typo:\n`);
  
  for (const stream of parentStreams) {
    const oldUrl = stream.streamUrl || '';
    const newUrl = oldUrl.replace(/^ahttps:\/\//, 'https://');
    
    console.log(`  - ${stream.slug}`);
    console.log(`    OLD: ${oldUrl}`);
    console.log(`    NEW: ${newUrl}`);
    
    await prisma.directStream.update({
      where: { id: stream.id },
      data: { streamUrl: newUrl }
    });
    
    console.log(`    ✅ Fixed!\n`);
  }

  // Fix DirectStreamEvent sub-events
  const events = await prisma.directStreamEvent.findMany({
    where: {
      streamUrl: {
        startsWith: 'ahttps://'
      }
    },
    select: {
      id: true,
      eventSlug: true,
      streamUrl: true,
      directStream: {
        select: {
          slug: true
        }
      }
    }
  });

  console.log(`Found ${events.length} events with typo:\n`);
  
  for (const event of events) {
    const oldUrl = event.streamUrl || '';
    const newUrl = oldUrl.replace(/^ahttps:\/\//, 'https://');
    
    console.log(`  - ${event.directStream.slug}/${event.eventSlug}`);
    console.log(`    OLD: ${oldUrl}`);
    console.log(`    NEW: ${newUrl}`);
    
    await prisma.directStreamEvent.update({
      where: { id: event.id },
      data: { streamUrl: newUrl }
    });
    
    console.log(`    ✅ Fixed!\n`);
  }

  const totalFixed = parentStreams.length + events.length;
  
  if (totalFixed === 0) {
    console.log('✅ No stream URLs with "ahttps://" typo found. All good!');
  } else {
    console.log(`\n✅ Fixed ${totalFixed} stream URL(s) total!`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
