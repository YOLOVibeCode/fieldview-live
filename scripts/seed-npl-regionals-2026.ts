/**
 * Seed NPL Regionals 2026 — FC Dutchman Surf 2010
 *
 * Creates ONE parent DirectStream with FIVE sub-events (game01..game05).
 *
 *   Parent:  /direct/npl-regionals2026-fc-dutchman-surf-2010
 *   Games:   /direct/npl-regionals2026-fc-dutchman-surf-2010/game01  ... /game05
 *
 * Idempotent: re-running upserts (safe to run again after editing GAMES below).
 *
 * Usage:
 *   Local:      DATABASE_URL="..." pnpm exec tsx scripts/seed-npl-regionals-2026.ts
 *   Production: DATABASE_URL="<prod url>" pnpm exec tsx scripts/seed-npl-regionals-2026.ts --production
 *
 * ⚠️  EDIT THE `GAMES` ARRAY BELOW before running:
 *      - `opponent`      → real opponent name (shows as away team)
 *      - `scheduledStartAt` → real kickoff (ISO 8601 WITH offset, e.g. Central = -05:00)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const isProduction = process.argv.includes('--production');

// ── PARENT CONFIG ────────────────────────────────────────────────────────────
const SURF = 'FC Dutchmen Surf Energy 10B NPL';
const SURF_COLOR = '#0B3D91'; // navy
const OPP_COLOR = '#DC2626'; // red (default for opponents)

const PARENT = {
  slug: 'npl-regionals2026-fc-dutchman-surf-2010',
  title: '2026 National Cup Southeast Regional — FC Dutchmen Surf Energy 10B NPL',
  adminPassword: 'surf2026', // ⚠️ change if you want a different admin password
};

// Owner account that owns these streams (receives any paywall revenue).
const OWNER = {
  name: 'FC Dutchmen Surf Energy',
  contactEmail: 'owner@fcdutchmensurf.com',
};

// ── PER-GAME CONFIG ── from official bracket (2026 National Cup SE Regional) ──
// Times are EDT (Eastern Daylight) = -04:00. home/away reflect the actual fixture.
const GAMES = [
  {
    eventSlug: 'game01',
    home: SURF, away: 'Mebane Youth MYSA 10/11B Elite',
    scheduledStartAt: '2026-06-20T09:00:00-04:00', // Sat Jun 20, 9:00 AM EDT — Truist Park 09 (#115)
  },
  {
    eventSlug: 'game02',
    home: 'NC United 10B', away: SURF, // Surf is AWAY this game
    scheduledStartAt: '2026-06-21T11:00:00-04:00', // Sun Jun 21, 11:00 AM EDT — Truist Park 09 (#119)
  },
  {
    eventSlug: 'game03',
    home: SURF, away: 'Highland FC 10B ECNL-RL',
    scheduledStartAt: '2026-06-22T16:00:00-04:00', // Mon Jun 22, 4:00 PM EDT — Truist Park 09 (#121)
  },
  {
    eventSlug: 'game04',
    home: SURF, away: 'Final — TBD', // Final, TENTATIVE — update opponent once seeded
    scheduledStartAt: '2026-06-23T10:00:00-04:00', // Tue Jun 23, 10:00 AM EDT — Truist Park 03 (tentative)
  },
];
// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding NPL Regionals 2026 — FC Dutchman Surf 2010');
  console.log(`Environment: ${isProduction ? '🔴 PRODUCTION' : '🟢 LOCAL'}\n`);

  // Find-or-create the Surf owner account (match by name OR contact email).
  let owner = await prisma.ownerAccount.findFirst({
    where: { OR: [{ name: OWNER.name }, { contactEmail: OWNER.contactEmail }] },
  });
  if (!owner) {
    owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: OWNER.name,
        status: 'active',
        contactEmail: OWNER.contactEmail,
      },
    });
    console.log(`✅ Created OwnerAccount: ${owner.name} (${owner.contactEmail})\n`);
  } else {
    console.log(`✅ Using OwnerAccount: ${owner.name} (${owner.contactEmail})\n`);
  }

  const adminPasswordHash = await bcrypt.hash(PARENT.adminPassword, 10);

  // Parent DirectStream (upsert)
  const parent = await prisma.directStream.upsert({
    where: { slug: PARENT.slug },
    update: {
      title: PARENT.title,
      ownerAccountId: owner.id, // reassign ownership on re-run
      chatEnabled: true,
      scoreboardEnabled: true,
      paywallEnabled: false,
      allowAnonymousView: true,
      requireEmailVerification: false,
      listed: true,
      sendReminders: true,
      reminderMinutes: 5,
      scoreboardHomeTeam: SURF,
      scoreboardAwayTeam: 'Opponent',
      scoreboardHomeColor: SURF_COLOR,
      scoreboardAwayColor: OPP_COLOR,
    },
    create: {
      slug: PARENT.slug,
      title: PARENT.title,
      ownerAccountId: owner.id,
      adminPassword: adminPasswordHash,
      chatEnabled: true,
      scoreboardEnabled: true,
      paywallEnabled: false,
      allowAnonymousView: true,
      requireEmailVerification: false,
      listed: true,
      sendReminders: true,
      reminderMinutes: 5,
      scoreboardHomeTeam: SURF,
      scoreboardAwayTeam: 'Opponent',
      scoreboardHomeColor: SURF_COLOR,
      scoreboardAwayColor: OPP_COLOR,
    },
  });
  console.log(`✅ Parent: /direct/${parent.slug}`);

  // Game events (upsert). Home/away colors track which side is FC Dutchmen Surf.
  for (const g of GAMES) {
    const title = `${g.home} vs ${g.away}`;
    const homeColor = g.home === SURF ? SURF_COLOR : OPP_COLOR;
    const awayColor = g.away === SURF ? SURF_COLOR : OPP_COLOR;
    await prisma.directStreamEvent.upsert({
      where: {
        directStreamId_eventSlug: { directStreamId: parent.id, eventSlug: g.eventSlug },
      },
      update: {
        title,
        scheduledStartAt: new Date(g.scheduledStartAt),
        chatEnabled: true,
        scoreboardEnabled: true,
        scoreboardHomeTeam: g.home,
        scoreboardAwayTeam: g.away,
        scoreboardHomeColor: homeColor,
        scoreboardAwayColor: awayColor,
      },
      create: {
        directStreamId: parent.id,
        eventSlug: g.eventSlug,
        title,
        scheduledStartAt: new Date(g.scheduledStartAt),
        chatEnabled: true,
        scoreboardEnabled: true,
        scoreboardHomeTeam: g.home,
        scoreboardAwayTeam: g.away,
        scoreboardHomeColor: homeColor,
        scoreboardAwayColor: awayColor,
      },
    });
    console.log(`   ✅ ${g.eventSlug}: /direct/${parent.slug}/${g.eventSlug}  — ${title}  @ ${g.scheduledStartAt}`);
  }

  console.log('\n✅ Done. Admin password for all 5 games:', PARENT.adminPassword);
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
