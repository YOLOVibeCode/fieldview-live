/**
 * Add TCHS Soccer Direct Stream Links for February 17, 2026 (public)
 * Creates public direct stream links for JV2, JV, and Varsity.
 *
 * URLs:
 *   https://fieldview.live/direct/tchs/soccer-20260217-jv2
 *   https://fieldview.live/direct/tchs/soccer-20260217-jv
 *   https://fieldview.live/direct/tchs/soccer-20260217-varsity
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260217.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const streams = [
  {
    slug: 'tchs/soccer-20260217-jv2',
    title: 'TCHS Soccer JV2 - February 17, 2026',
    homeTeamName: 'TCHS JV2',
  },
  {
    slug: 'tchs/soccer-20260217-jv',
    title: 'TCHS Soccer JV - February 17, 2026',
    homeTeamName: 'TCHS JV',
  },
  {
    slug: 'tchs/soccer-20260217-varsity',
    title: 'TCHS Soccer Varsity - February 17, 2026',
    homeTeamName: 'TCHS Varsity',
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Adding TCHS Soccer Direct Stream Links (public)       ║');
  console.log('║  February 17, 2026                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const defaultOwner = await prisma.ownerAccount.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!defaultOwner) {
    console.error('❌ Error: No OwnerAccount found. Create one first.');
    process.exit(1);
  }

  console.log(`✅ Using OwnerAccount: ${defaultOwner.name}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const adminPasswordHash = await bcrypt.hash('tchs2026', 10);
  const scheduledAt = new Date('2026-02-17T19:00:00Z');

  for (const streamData of streams) {
    try {
      const existing = await prisma.directStream.findUnique({
        where: { slug: streamData.slug },
      });

      const gameTitle = `Direct Stream: ${streamData.slug}`;

      if (existing) {
        console.log(`   🔄 Updating: ${streamData.slug}`);

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
              startsAt: scheduledAt,
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
            adminPassword: adminPasswordHash,
            chatEnabled: true,
            scoreboardEnabled: true,
            allowAnonymousView: true,
            listed: true,
            gameId: game.id,
            scoreboardHomeTeam: streamData.homeTeamName,
            scoreboardAwayTeam: 'Opponent',
          },
        });

        updated++;
      } else {
        console.log(`   ✅ Creating: ${streamData.slug}`);

        const game = await prisma.game.create({
          data: {
            ownerAccountId: defaultOwner.id,
            title: gameTitle,
            homeTeam: streamData.homeTeamName,
            awayTeam: 'TBD',
            startsAt: scheduledAt,
            priceCents: 0,
            currency: 'USD',
            keywordCode: `DIRECT-${streamData.slug.toUpperCase().replace(/\//g, '-')}-${Date.now()}`,
            qrUrl: `https://fieldview.live/direct/${streamData.slug}`,
            state: 'active',
          },
        });

        await prisma.directStream.create({
          data: {
            slug: streamData.slug,
            title: streamData.title,
            streamUrl: null,
            scheduledStartAt: scheduledAt,
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
            scoreboardHomeColor: '#1E3A8A',
            scoreboardAwayColor: '#DC2626',
            ownerAccountId: defaultOwner.id,
            gameId: game.id,
          },
        });

        created++;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed ${streamData.slug}:`, msg);
      skipped++;
    }
  }

  console.log(`\n✅ Done: ${created} created, ${updated} updated, ${skipped} skipped\n`);
  console.log('🌐 Public direct links:');
  console.log('   https://fieldview.live/direct/tchs/soccer-20260217-jv2');
  console.log('   https://fieldview.live/direct/tchs/soccer-20260217-jv');
  console.log('   https://fieldview.live/direct/tchs/soccer-20260217-varsity\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
