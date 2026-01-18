#!/usr/bin/env npx tsx
/**
 * Veo Discovery Test Data Seeder
 *
 * Seeds test data for the Veo Discovery marketing campaign.
 * Works on both local and production (Railway) databases.
 *
 * Usage:
 *   LOCAL:      npx tsx scripts/seed-veo-discovery-data.ts
 *   PRODUCTION: DATABASE_URL="postgresql://..." npx tsx scripts/seed-veo-discovery-data.ts --production
 *
 * Options:
 *   --production    Use production prefix (veo-demo- instead of e2e-test-)
 *   --cleanup       Remove all seeded data
 *   --dry-run       Show what would be created without creating
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from apps/api/.env
config({ path: resolve(__dirname, '../apps/api/.env') });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Detect environment
const isProduction = process.argv.includes('--production');
const isCleanup = process.argv.includes('--cleanup');
const isDryRun = process.argv.includes('--dry-run');

// Prefixes for identifying seeded data
const PREFIX = isProduction ? 'veo-demo' : 'e2e-test';
const DOMAIN = isProduction ? 'demo.fieldview.live' : 'test.fieldview.live';

// Test HLS stream (Big Buck Bunny - public test stream)
const TEST_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Shared password for all test accounts
const TEST_PASSWORD = 'VeoDemo2026!';

const prisma = new PrismaClient();

// ============================================
// DATA DEFINITIONS
// ============================================

interface OwnerConfig {
  emailSuffix: string;
  name: string;
  type: 'owner' | 'association';
  freeGamesUsed: number;
  subscriptionTier: string | null;
  description: string;
}

interface StreamConfig {
  slugSuffix: string;
  title: string;
  paywallEnabled: boolean;
  priceInCents: number;
  ownerEmailSuffix: string;
  description: string;
}

const OWNERS: OwnerConfig[] = [
  {
    emailSuffix: 'coach-williams',
    name: 'Coach Williams (Soccer)',
    type: 'owner',
    freeGamesUsed: 0,
    subscriptionTier: null,
    description: 'Fresh coach account - 0/5 free games used',
  },
  {
    emailSuffix: 'coach-martinez',
    name: 'Coach Martinez (Basketball)',
    type: 'owner',
    freeGamesUsed: 3,
    subscriptionTier: null,
    description: 'Active coach - 3/5 free games used',
  },
  {
    emailSuffix: 'lincoln-high',
    name: 'Lincoln High School Athletics',
    type: 'association',
    freeGamesUsed: 5,
    subscriptionTier: null,
    description: 'School at free limit - must enable paywall',
  },
  {
    emailSuffix: 'stormfc',
    name: 'Storm FC Youth Club',
    type: 'association',
    freeGamesUsed: 0,
    subscriptionTier: 'pro',
    description: 'Pro subscriber - unlimited free streams',
  },
];

const STREAMS: StreamConfig[] = [
  {
    slugSuffix: 'jv-soccer',
    title: 'JV Soccer vs Riverside',
    paywallEnabled: false,
    priceInCents: 0,
    ownerEmailSuffix: 'coach-williams',
    description: 'Free stream (coach trial)',
  },
  {
    slugSuffix: 'varsity-basketball',
    title: 'Varsity Basketball vs State Champs',
    paywallEnabled: true,
    priceInCents: 499, // $4.99
    ownerEmailSuffix: 'coach-martinez',
    description: 'Paid stream ($4.99)',
  },
  {
    slugSuffix: 'homecoming-football',
    title: 'Homecoming Football Game',
    paywallEnabled: true,
    priceInCents: 999, // $9.99
    ownerEmailSuffix: 'lincoln-high',
    description: 'Premium school fundraiser ($9.99)',
  },
  {
    slugSuffix: 'club-showcase',
    title: 'Storm FC Club Showcase',
    paywallEnabled: false,
    priceInCents: 0,
    ownerEmailSuffix: 'stormfc',
    description: 'Free stream (pro subscriber)',
  },
  {
    slugSuffix: 'tournament-finals',
    title: 'Tournament Finals Live',
    paywallEnabled: true,
    priceInCents: 799, // $7.99
    ownerEmailSuffix: 'stormfc',
    description: 'Paid tournament stream ($7.99)',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getEmail(suffix: string): string {
  return `${PREFIX}-${suffix}@${DOMAIN}`;
}

function getSlug(suffix: string): string {
  return `${PREFIX}-${suffix}`;
}

function log(message: string, data?: unknown): void {
  const prefix = isDryRun ? '[DRY RUN]' : '';
  console.log(`${prefix} ${message}`, data || '');
}

// ============================================
// CLEANUP
// ============================================

async function cleanup(): Promise<void> {
  log(`🧹 Cleaning up data with prefix: ${PREFIX}`);

  // Order matters due to foreign keys
  const deleteResults = {
    streamRegistrations: await prisma.directStreamRegistration.deleteMany({
      where: { directStream: { slug: { startsWith: PREFIX } } },
    }),
    purchases: await prisma.purchase.deleteMany({
      where: { directStream: { slug: { startsWith: PREFIX } } },
    }),
    scoreboards: await prisma.gameScoreboard.deleteMany({
      where: { directStream: { slug: { startsWith: PREFIX } } },
    }),
    streams: await prisma.directStream.deleteMany({
      where: { slug: { startsWith: PREFIX } },
    }),
    ownerFingerprints: await prisma.ownerAccountFingerprint.deleteMany({
      where: { ownerAccount: { contactEmail: { contains: PREFIX } } },
    }),
    fingerprints: await prisma.deviceFingerprint.deleteMany({
      where: { fingerprintHash: { startsWith: PREFIX } },
    }),
    ownerUsers: await prisma.ownerUser.deleteMany({
      where: { email: { contains: PREFIX } },
    }),
    ownerAccounts: await prisma.ownerAccount.deleteMany({
      where: { contactEmail: { contains: PREFIX } },
    }),
  };

  log('  Deleted:', deleteResults);
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedOwners(): Promise<Map<string, string>> {
  log('\n👤 Creating owner accounts...');

  const ownerMap = new Map<string, string>();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const config of OWNERS) {
    const email = getEmail(config.emailSuffix);

    if (isDryRun) {
      log(`  Would create: ${email} - ${config.description}`);
      ownerMap.set(config.emailSuffix, 'dry-run-id');
      continue;
    }

    // Check if exists
    const existing = await prisma.ownerAccount.findFirst({
      where: { contactEmail: email },
    });

    if (existing) {
      log(`  Exists: ${email}`);
      ownerMap.set(config.emailSuffix, existing.id);
      continue;
    }

    const account = await prisma.ownerAccount.create({
      data: {
        type: config.type,
        name: config.name,
        status: 'active',
        contactEmail: email,
        freeGamesUsed: config.freeGamesUsed,
        subscriptionTier: config.subscriptionTier,
        subscriptionEndsAt: config.subscriptionTier
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          : null,
      },
    });

    await prisma.ownerUser.create({
      data: {
        ownerAccountId: account.id,
        email,
        passwordHash,
        role: 'owner_admin',
        status: 'active',
      },
    });

    log(`  ✅ Created: ${email} - ${config.description}`);
    ownerMap.set(config.emailSuffix, account.id);
  }

  return ownerMap;
}

async function seedStreams(ownerMap: Map<string, string>): Promise<void> {
  log('\n📺 Creating direct streams...');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  for (const config of STREAMS) {
    const slug = getSlug(config.slugSuffix);
    const ownerId = ownerMap.get(config.ownerEmailSuffix);

    if (!ownerId || ownerId === 'dry-run-id') {
      if (isDryRun) {
        log(`  Would create: /direct/${slug} - ${config.description}`);
      }
      continue;
    }

    // Check if exists
    const existing = await prisma.directStream.findUnique({
      where: { slug },
    });

    if (existing) {
      log(`  Exists: /direct/${slug}`);
      continue;
    }

    const stream = await prisma.directStream.create({
      data: {
        slug,
        title: config.title,
        ownerAccountId: ownerId,
        streamUrl: TEST_HLS_URL,
        paywallEnabled: config.paywallEnabled,
        priceInCents: config.priceInCents,
        paywallMessage: config.paywallEnabled
          ? 'Support our team by purchasing access to this live stream!'
          : null,
        adminPassword: adminPasswordHash,
        chatEnabled: true,
        scoreboardEnabled: true,
        allowViewerScoreEdit: false,
        allowViewerNameEdit: false,
        allowAnonymousView: !config.paywallEnabled,
        requireEmailVerification: true,
        listed: true,
        status: 'active',
        sendReminders: true,
        reminderMinutes: 5,
        scheduledStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      },
    });

    // Create scoreboard
    await prisma.gameScoreboard.create({
      data: {
        directStreamId: stream.id,
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeJerseyColor: '#1E40AF',
        awayJerseyColor: '#DC2626',
        homeScore: 0,
        awayScore: 0,
        isVisible: true,
      },
    });

    const priceStr = config.paywallEnabled
      ? `$${(config.priceInCents / 100).toFixed(2)}`
      : 'FREE';

    log(`  ✅ Created: /direct/${slug} (${priceStr}) - ${config.description}`);
  }
}

async function seedAbuseTestData(ownerMap: Map<string, string>): Promise<void> {
  log('\n🔍 Creating abuse detection test data...');

  if (isDryRun) {
    log('  Would create test fingerprints');
    return;
  }

  // Create fingerprint linked to multiple accounts (for abuse testing)
  const fingerprintHash = `${PREFIX}-abuse-fingerprint-${Date.now()}`;

  const fingerprint = await prisma.deviceFingerprint.create({
    data: {
      fingerprintHash,
      ipAddresses: ['192.168.1.100', '192.168.1.101'],
      abuseScore: 0,
      warningsShown: 0,
      oneTimePassUsed: false,
    },
  });

  // Link first two owners to this fingerprint (simulates abuse)
  const ownerIds = Array.from(ownerMap.values()).slice(0, 2);

  for (const ownerId of ownerIds) {
    if (ownerId === 'dry-run-id') continue;

    await prisma.ownerAccountFingerprint.create({
      data: {
        ownerAccountId: ownerId,
        deviceFingerprintId: fingerprint.id,
        registrationIp: '192.168.1.100',
      },
    });
  }

  log(`  ✅ Created abuse test fingerprint (linked to ${ownerIds.length} accounts)`);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const env = isProduction ? '🚀 PRODUCTION' : '💻 LOCAL';

  console.log('\n========================================');
  console.log(`  Veo Discovery Data Seeder (${env})`);
  console.log('========================================\n');
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Password: ${TEST_PASSWORD}`);
  console.log('');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  if (isCleanup) {
    await cleanup();
    console.log('\n✅ Cleanup complete!\n');
    return;
  }

  // Cleanup before seeding (for idempotency)
  if (!isDryRun) {
    await cleanup();
  }

  // Seed data
  const ownerMap = await seedOwners();
  await seedStreams(ownerMap);
  
  // Only seed abuse data in non-production
  if (!isProduction) {
    await seedAbuseTestData(ownerMap);
  }

  // Print summary
  console.log('\n========================================');
  console.log('  SEED COMPLETE');
  console.log('========================================\n');

  console.log('📧 Test Accounts (Password: ' + TEST_PASSWORD + ')');
  for (const config of OWNERS) {
    console.log(`   ${getEmail(config.emailSuffix)}`);
    console.log(`      └─ ${config.description}`);
  }

  console.log('\n📺 Test Streams');
  for (const config of STREAMS) {
    const priceStr = config.paywallEnabled
      ? `$${(config.priceInCents / 100).toFixed(2)}`
      : 'FREE';
    console.log(`   /direct/${getSlug(config.slugSuffix)} (${priceStr})`);
    console.log(`      └─ ${config.description}`);
  }

  if (isProduction) {
    console.log('\n🌐 Production URLs:');
    console.log('   https://fieldview.live?ref=veo  (Welcome modal)');
    for (const config of STREAMS) {
      console.log(`   https://fieldview.live/direct/${getSlug(config.slugSuffix)}`);
    }
  } else {
    console.log('\n🌐 Local URLs:');
    console.log('   http://localhost:4300?ref=veo  (Welcome modal)');
    for (const config of STREAMS) {
      console.log(`   http://localhost:4300/direct/${getSlug(config.slugSuffix)}`);
    }
  }

  console.log('\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
