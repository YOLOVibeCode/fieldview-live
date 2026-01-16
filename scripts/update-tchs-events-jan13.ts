import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating TCHS events to January 13, 2026...\n');

  // Find the TCHS stream
  const tchsStream = await prisma.directStream.findUnique({
    where: { slug: 'tchs' }
  });

  if (!tchsStream) {
    throw new Error('TCHS stream not found');
  }

  // Delete existing January 16 events
  const deleted = await prisma.directStreamEvent.deleteMany({
    where: {
      directStreamId: tchsStream.id,
      eventSlug: {
        in: ['soccer-20260116-jv2', 'soccer-20260116-jv', 'soccer-20260116-varsity']
      }
    }
  });
  
  console.log(`✅ Deleted ${deleted.count} old events (Jan 16)\n`);

  // Create January 13 events
  const events = [
    {
      eventSlug: 'soccer-20260113-jv2',
      title: 'TCHS Soccer - JV2 (Jan 13, 2026)',
      scheduledStartAt: new Date('2026-01-13T16:30:00-06:00'), // 4:30 PM CST
    },
    {
      eventSlug: 'soccer-20260113-jv',
      title: 'TCHS Soccer - JV (Jan 13, 2026)',
      scheduledStartAt: new Date('2026-01-13T18:00:00-06:00'), // 6:00 PM CST
    },
    {
      eventSlug: 'soccer-20260113-varsity',
      title: 'TCHS Soccer - Varsity (Jan 13, 2026)',
      scheduledStartAt: new Date('2026-01-13T19:30:00-06:00'), // 7:30 PM CST
    },
  ];

  for (const event of events) {
    const created = await prisma.directStreamEvent.create({
      data: {
        directStreamId: tchsStream.id,
        eventSlug: event.eventSlug,
        title: event.title,
        scheduledStartAt: event.scheduledStartAt,
        status: 'upcoming',
        chatEnabled: true,
        scoreboardEnabled: true,
        paywallEnabled: false,
        allowAnonymousView: true,
        requireEmailVerification: false,
        listed: true,
        scoreboardHomeTeam: 'TCHS',
        scoreboardAwayTeam: 'Opponent',
        scoreboardHomeColor: '#1a237e',
        scoreboardAwayColor: '#c62828',
      },
    });
    
    console.log(`✅ Created: ${event.eventSlug}`);
    console.log(`   URL: http://localhost:4300/direct/tchs/${event.eventSlug}`);
    console.log(`   Scheduled: ${event.scheduledStartAt.toLocaleString()}\n`);
  }

  console.log('\n🎉 Local database updated successfully!');
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

