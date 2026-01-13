import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTchsSoccerGames() {
  console.log('🎬 Adding TCHS Soccer Games for January 12, 2026...\n');

  try {
    // Find the parent TCHS stream
    const parentStream = await prisma.directStream.findUnique({
      where: { slug: 'tchs' },
    });

    if (!parentStream) {
      throw new Error('Parent stream "tchs" not found!');
    }

    console.log(`✅ Found parent stream: ${parentStream.title}\n`);

    // Define the three games (CST times)
    const games = [
      {
        eventSlug: 'soccer-20260112-jv2',
        title: 'TCHS Soccer - JV2 vs TBA',
        scheduledStartAt: new Date('2026-01-12T16:30:00-06:00'), // 4:30 PM CST
      },
      {
        eventSlug: 'soccer-20260112-jv',
        title: 'TCHS Soccer - JV vs TBA',
        scheduledStartAt: new Date('2026-01-12T18:00:00-06:00'), // 6:00 PM CST
      },
      {
        eventSlug: 'soccer-20260112-varsity',
        title: 'TCHS Soccer - Varsity vs TBA',
        scheduledStartAt: new Date('2026-01-12T19:30:00-06:00'), // 7:30 PM CST
      },
    ];

    // Create each game
    for (const game of games) {
      console.log(`📝 Creating: ${game.title}`);
      console.log(`   Slug: ${game.eventSlug}`);
      console.log(`   URL: https://fieldview.live/direct/tchs/${game.eventSlug}`);
      console.log(`   Scheduled: ${game.scheduledStartAt.toLocaleString()}`);

      const event = await prisma.directStreamEvent.upsert({
        where: {
          directStreamId_eventSlug: {
            directStreamId: parentStream.id,
            eventSlug: game.eventSlug,
          },
        },
        update: {
          title: game.title,
          scheduledStartAt: game.scheduledStartAt,
          status: 'active',
        },
        create: {
          directStreamId: parentStream.id,
          eventSlug: game.eventSlug,
          title: game.title,
          scheduledStartAt: game.scheduledStartAt,
          status: 'active',
          chatEnabled: true,
          scoreboardEnabled: true,
          requireEmailVerification: true,
        },
      });

      console.log(`✅ Created event: ${event.id}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Successfully added all 3 TCHS Soccer games!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔗 Access URLs:');
    console.log('   JV2:     https://fieldview.live/direct/tchs/soccer-20260112-jv2');
    console.log('   JV:      https://fieldview.live/direct/tchs/soccer-20260112-jv');
    console.log('   Varsity: https://fieldview.live/direct/tchs/soccer-20260112-varsity\n');
  } catch (error) {
    console.error('❌ Error adding games:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addTchsSoccerGames()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

