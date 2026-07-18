/**
 * Create sample DirectStreamEvent
 * 
 * Creates: /direct/tchs/soccer-20260109-varsity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find TCHS parent stream
  const tchs = await prisma.directStream.findUnique({
    where: { slug: 'tchs' },
  });
  
  if (!tchs) {
    console.error('❌ TCHS DirectStream not found. Run seed script first.');
    process.exit(1);
  }
  
  console.log(`✅ Found TCHS: ${tchs.id} - ${tchs.title}`);
  
  // Create sample event
  const event = await prisma.directStreamEvent.create({
    data: {
      directStreamId: tchs.id,
      eventSlug: 'soccer-20260109-varsity',
      title: 'TCHS Varsity Soccer - January 9, 2026',
      scheduledStartAt: new Date('2026-01-09T18:00:00Z'),
      streamUrl: null, // Will inherit from parent
      
      // Feature overrides (null = inherit from parent)
      chatEnabled: null,
      scoreboardEnabled: true, // Enable scoreboard for this event
      paywallEnabled: null,
      priceInCents: null,
      paywallMessage: null,
      allowAnonymousView: null,
      requireEmailVerification: null,
      listed: true, // Make it publicly listed
      
      // Scoreboard customization for this event
      scoreboardHomeTeam: 'TCHS Varsity',
      scoreboardAwayTeam: 'Rival HS',
      scoreboardHomeColor: '#0000FF', // Blue
      scoreboardAwayColor: '#FF0000', // Red
    },
  });
  
  console.log(`✅ Created event: ${event.eventSlug}`);
  console.log(`   URL: /direct/tchs/${event.eventSlug}`);
  console.log(`   Title: ${event.title}`);
  console.log(`   Scheduled: ${event.scheduledStartAt}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

