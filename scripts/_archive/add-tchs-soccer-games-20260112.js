#!/usr/bin/env node
/**
 * Add TCHS Soccer Games for January 12, 2026
 * 
 * Creates 3 direct stream sub-events:
 * - JV2 Team
 * - JV Team  
 * - Varsity Team
 */

const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));

const prisma = new PrismaClient();

async function addTchsSoccerGames() {
  console.log('🎬 Adding TCHS Soccer Games for January 12, 2026...\n');

  try {
    // Find the parent TCHS stream
    const parentStream = await prisma.directStream.findUnique({
      where: { slug: 'tchs' }
    });

    if (!parentStream) {
      throw new Error('Parent stream "tchs" not found! Please create it first.');
    }

    console.log(`✅ Found parent stream: ${parentStream.title} (${parentStream.slug})\n`);

    // Define the three games
    const games = [
      {
        slug: 'soccer-20260112-jv2',
        title: 'TCHS Soccer - JV2 vs TBA',
        description: 'Twin Cities High School Soccer - JV2 Team game on January 12, 2026',
        scheduledStartTime: new Date('2026-01-12T14:00:00-08:00'), // 2 PM PST
      },
      {
        slug: 'soccer-20260112-jv',
        title: 'TCHS Soccer - JV vs TBA',
        description: 'Twin Cities High School Soccer - JV Team game on January 12, 2026',
        scheduledStartTime: new Date('2026-01-12T15:30:00-08:00'), // 3:30 PM PST
      },
      {
        slug: 'soccer-20260112-varsity',
        title: 'TCHS Soccer - Varsity vs TBA',
        description: 'Twin Cities High School Soccer - Varsity Team game on January 12, 2026',
        scheduledStartTime: new Date('2026-01-12T17:00:00-08:00'), // 5 PM PST
      },
    ];

    // Create each game
    for (const game of games) {
      console.log(`📝 Creating: ${game.title}`);
      console.log(`   Slug: ${game.slug}`);
      console.log(`   URL: https://fieldview.live/direct/tchs/${game.slug}`);
      console.log(`   Scheduled: ${game.scheduledStartTime.toLocaleString()}`);

      const event = await prisma.directStreamEvent.upsert({
        where: {
          directStreamId_slug: {
            directStreamId: parentStream.id,
            slug: game.slug,
          },
        },
        update: {
          title: game.title,
          description: game.description,
          scheduledStartTime: game.scheduledStartTime,
          isActive: true,
        },
        create: {
          directStreamId: parentStream.id,
          slug: game.slug,
          title: game.title,
          description: game.description,
          scheduledStartTime: game.scheduledStartTime,
          isActive: true,
          allowChat: true,
          allowScoreboard: true,
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

