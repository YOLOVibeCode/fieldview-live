#!/usr/bin/env node
/**
 * Fix Stream URL - Simple Node.js approach
 * 
 * Usage: railway run --service api -- node scripts/fix-stream-url-simple.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing stream URL for soccer-20260116-jv...\n');

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

  // Find the event
  const event = await prisma.directStreamEvent.findFirst({
    where: {
      eventSlug: 'soccer-20260116-jv',
      directStreamId: parent.id
    },
    select: {
      id: true,
      eventSlug: true,
      streamUrl: true
    }
  });

  if (!event) {
    console.error('❌ Event "soccer-20260116-jv" not found!');
    process.exit(1);
  }

  console.log(`✓ Found event: ${event.eventSlug}`);
  console.log(`  Current URL: ${event.streamUrl}\n`);

  // Update with the correct URL
  const correctUrl = 'https://stream.mux.com/9b8FqDtpFAnkUvQUhVNrs00Kq00icRnOqmL7LELXPOUKk.m3u8';
  
  const updated = await prisma.directStreamEvent.update({
    where: { id: event.id },
    data: { streamUrl: correctUrl }
  });

  console.log(`✅ Updated stream URL!`);
  console.log(`  New URL: ${updated.streamUrl}\n`);
  
  console.log('🎉 Fix complete! Stream should now load correctly.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
