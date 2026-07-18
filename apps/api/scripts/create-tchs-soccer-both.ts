/**
 * Create TCHS Soccer Streams for January 20, 2026
 * LOCAL and PRODUCTION
 */

import { PrismaClient } from '@prisma/client';

const LOCAL_DATABASE = "postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public";
const PRODUCTION_DATABASE = process.env.PRODUCTION_DATABASE_URL || "";

const streams = [
  {
    slug: 'tchs/soccer-20260120-jv2',
    title: 'TCHS Soccer JV2 - January 20, 2026',
    description: 'Twin City High School Soccer JV2 Team',
    homeTeamName: 'TCHS JV2',
  },
  {
    slug: 'tchs/soccer-20260120-jv',
    title: 'TCHS Soccer JV - January 20, 2026',
    description: 'Twin City High School Soccer JV Team',
    homeTeamName: 'TCHS JV',
  },
  {
    slug: 'tchs/soccer-20260120-varsity',
    title: 'TCHS Soccer Varsity - January 20, 2026',
    description: 'Twin City High School Soccer Varsity Team',
    homeTeamName: 'TCHS Varsity',
  },
];

async function createStreamsInDatabase(databaseUrl: string, envName: string) {
  console.log(`\n🔄 Creating streams in ${envName} database...\n`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Debug: Check what's in prisma
    console.log('Prisma keys:', Object.keys(prisma).slice(0, 10));
    console.log('Has owner?', 'owner' in prisma);
    
    // Find TCHS owner
    const owner = await prisma.owner.findFirst({
      where: { 
        OR: [
          { slug: 'tchs' },
          { name: { contains: 'Twin City', mode: 'insensitive' } },
        ]
      },
    });

    if (!owner) {
      console.error(`❌ TCHS owner not found in ${envName}!`);
      console.log('   Creating a placeholder owner...\n');
      
      // Create owner if it doesn't exist
      const newOwner = await prisma.owner.create({
        data: {
          slug: 'tchs',
          name: 'Twin City High School',
          email: 'athletics@tchs.edu',
          // Add other required fields as needed
        },
      });
      
      console.log(`✅ Created owner: ${newOwner.name}\n`);
      
      return await createStreamsForOwner(prisma, newOwner.id, envName);
    }

    console.log(`✅ Found owner: ${owner.name} (${owner.slug})\n`);
    
    return await createStreamsForOwner(prisma, owner.id, envName);

  } catch (error) {
    console.error(`❌ Error in ${envName}:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createStreamsForOwner(prisma: PrismaClient, ownerId: string, envName: string) {
  const results = [];

  for (const streamData of streams) {
    try {
      // Upsert DirectStream
      const stream = await prisma.directStream.upsert({
        where: { slug: streamData.slug },
        create: {
          slug: streamData.slug,
          title: streamData.title,
          description: streamData.description,
          streamUrl: `https://stream.mux.com/placeholder-${streamData.slug.split('/').pop()}.m3u8`,
          ownerId: ownerId,
          chatEnabled: true,
          paywallEnabled: false,
          priceInCents: 0,
          scoreboardEnabled: true,
        },
        update: {
          title: streamData.title,
          description: streamData.description,
          chatEnabled: true,
          scoreboardEnabled: true,
        },
      });

      console.log(`   ✅ ${streamData.slug}`);

      // Upsert GameScoreboard
      await prisma.gameScoreboard.upsert({
        where: { directStreamId: stream.id },
        create: {
          directStreamId: stream.id,
          homeTeamName: streamData.homeTeamName,
          awayTeamName: 'Away Team',
          homeJerseyColor: '#003366',
          awayJerseyColor: '#CC0000',
          homeScore: 0,
          awayScore: 0,
          clockMode: 'stopped',
          clockSeconds: 0,
          isVisible: true,
          position: 'top',
        },
        update: {
          homeTeamName: streamData.homeTeamName,
        },
      });

      results.push(stream);
    } catch (error) {
      console.error(`   ❌ Failed to create ${streamData.slug}:`, error);
    }
  }

  console.log(`\n✅ Created ${results.length}/${streams.length} streams in ${envName}\n`);
  return results;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Creating TCHS Soccer Streams - January 20, 2026      ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Create in LOCAL
  console.log('\n📍 LOCAL ENVIRONMENT');
  await createStreamsInDatabase(LOCAL_DATABASE, 'LOCAL');
  
  console.log('🌐 LOCAL URLs:');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-jv2');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-jv');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-varsity');

  // Create in PRODUCTION
  if (PRODUCTION_DATABASE) {
    console.log('\n📍 PRODUCTION ENVIRONMENT');
    await createStreamsInDatabase(PRODUCTION_DATABASE, 'PRODUCTION');
    
    console.log('\n🌐 PRODUCTION URLs:');
    console.log('   • https://fieldview.live/direct/tchs/soccer-20260120-jv2');
    console.log('   • https://fieldview.live/direct/tchs/soccer-20260120-jv');
    console.log('   • https://fieldview.live/direct/tchs/soccer-20260120-varsity');
  } else {
    console.log('\n⚠️  PRODUCTION_DATABASE_URL not set, skipping production');
    console.log('   Set PRODUCTION_DATABASE_URL to create in production');
  }

  console.log('\n✅ All done!\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
