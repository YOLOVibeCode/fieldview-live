/**
 * Add TCHS Soccer Direct Stream Links for February 6, 2026
 * Creates direct stream links for JV2, JV, and Varsity teams
 * 
 * Usage:
 *   Local:      DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260206.ts
 *   Production: DATABASE_URL="<production-url>" pnpm exec tsx scripts/add-tchs-soccer-20260206.ts
 * 
 * Note: Get production DATABASE_URL from Railway dashboard → Postgres service → Variables
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const streams = [
  {
    slug: 'tchs/soccer-20260206-jv2',
    title: 'TCHS Soccer JV2 - February 6, 2026',
    homeTeamName: 'TCHS JV2',
  },
  {
    slug: 'tchs/soccer-20260206-jv',
    title: 'TCHS Soccer JV - February 6, 2026',
    homeTeamName: 'TCHS JV',
  },
  {
    slug: 'tchs/soccer-20260206-varsity',
    title: 'TCHS Soccer Varsity - February 6, 2026',
    homeTeamName: 'TCHS Varsity',
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Adding TCHS Soccer Direct Stream Links              ║');
  console.log('║  February 6, 2026                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Get default owner account
  const defaultOwner = await prisma.ownerAccount.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!defaultOwner) {
    console.error('❌ Error: No OwnerAccount found. Please create one first.');
    process.exit(1);
  }

  console.log(`✅ Using OwnerAccount: ${defaultOwner.name} (${defaultOwner.contactEmail})\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const streamData of streams) {
    try {
      // Check if stream exists
      const existing = await prisma.directStream.findUnique({
        where: { slug: streamData.slug },
      });

      // Hash admin password
      const adminPasswordHash = await bcrypt.hash('tchs2026', 10);

      // Game title for this stream
      const gameTitle = `Direct Stream: ${streamData.slug}`;

      if (existing) {
        // Update existing stream
        console.log(`   🔄 Updating: ${streamData.slug}`);

        // Ensure Game exists
        let game = await prisma.game.findFirst({
          where: { title: gameTitle },
          select: { id: true },
        });

        if (!game) {
          game = await prisma.game.create({
            data: {
              ownerAccountId: defaultOwner.id,
              title: gameTitle,
              homeTeam: streamData.homeTeamName,
              awayTeam: 'TBD',
              startsAt: new Date('2026-02-06T19:00:00Z'), // Feb 6, 2026 7pm
              priceCents: 0,
              currency: 'USD',
              keywordCode: `DIRECT-${streamData.slug.toUpperCase().replace(/\//g, '-')}-${Date.now()}`,
              qrUrl: `https://fieldview.live/direct/${streamData.slug}`,
              state: 'active',
            },
          });
        }

        await prisma.directStream.update({
          where: { slug: streamData.slug },
          data: {
            title: streamData.title,
            chatEnabled: true,
            scoreboardEnabled: true,
            gameId: game.id,
          },
        });

        updated++;
      } else {
        // Create new stream
        console.log(`   ✅ Creating: ${streamData.slug}`);

        // Create Game record
        const game = await prisma.game.create({
          data: {
            ownerAccountId: defaultOwner.id,
            title: gameTitle,
            homeTeam: streamData.homeTeamName,
            awayTeam: 'TBD',
            startsAt: new Date('2026-02-06T19:00:00Z'), // Feb 6, 2026 7pm
            priceCents: 0,
            currency: 'USD',
            keywordCode: `DIRECT-${streamData.slug.toUpperCase().replace(/\//g, '-')}-${Date.now()}`,
            qrUrl: `https://fieldview.live/direct/${streamData.slug}`,
            state: 'active',
          },
        });

        // Create DirectStream
        await prisma.directStream.create({
          data: {
            slug: streamData.slug,
            title: streamData.title,
            streamUrl: null, // Will be set later via admin panel
            scheduledStartAt: new Date('2026-02-06T19:00:00Z'),
            paywallEnabled: false,
            priceInCents: 0,
            paywallMessage: null,
            allowSavePayment: false,
            adminPassword: adminPasswordHash,
            chatEnabled: true,
            scoreboardEnabled: true,
            allowAnonymousView: true,
            requireEmailVerification: false,
            listed: true,
            sendReminders: true,
            reminderMinutes: 5,
            scoreboardHomeTeam: streamData.homeTeamName,
            scoreboardAwayTeam: 'Opponent',
            scoreboardHomeColor: '#1E3A8A', // Dark blue
            scoreboardAwayColor: '#DC2626', // Red
            ownerAccountId: defaultOwner.id,
            gameId: game.id,
          },
        });

        created++;
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to process ${streamData.slug}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Complete: ${created} created, ${updated} updated, ${skipped} skipped\n`);

  console.log('🌐 Direct Stream URLs:');
  console.log('   • https://fieldview.live/direct/tchs/soccer-20260206-jv2');
  console.log('   • https://fieldview.live/direct/tchs/soccer-20260206-jv');
  console.log('   • https://fieldview.live/direct/tchs/soccer-20260206-varsity\n');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
