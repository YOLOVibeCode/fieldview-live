/**
 * E2E Test Data Seeder
 *
 * Creates test data for Veo Discovery E2E tests.
 * Run with: npx tsx scripts/seed-e2e-test-data.ts
 *
 * Creates:
 * - Test owner accounts (with various freemium states)
 * - Test direct streams (free and paid)
 * - Test device fingerprints (for abuse detection)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test data configuration
const TEST_PREFIX = 'e2e-test';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

interface TestOwner {
  email: string;
  name: string;
  freeGamesUsed: number;
  subscriptionTier: string | null;
}

interface TestStream {
  slug: string;
  title: string;
  paywallEnabled: boolean;
  priceInCents: number;
  ownerEmail: string;
}

async function main() {
  console.log('🌱 Seeding E2E test data...\n');

  // Clean up previous test data
  console.log('🧹 Cleaning up previous test data...');
  await cleanup();

  // Create test owners with various states
  console.log('\n👤 Creating test owners...');
  const owners = await createTestOwners();

  // Create test streams
  console.log('\n📺 Creating test streams...');
  await createTestStreams(owners);

  // Create test fingerprints
  console.log('\n🔍 Creating test fingerprints...');
  await createTestFingerprints(owners);

  console.log('\n✅ E2E test data seeded successfully!\n');
  console.log('Test accounts:');
  console.log('  - Email: e2e-test-coach@fieldview.live (Password: TestPassword123!)');
  console.log('  - Email: e2e-test-school@fieldview.live (Password: TestPassword123!)');
  console.log('  - Email: e2e-test-limit@fieldview.live (5/5 free games used)');
  console.log('\nTest streams:');
  console.log('  - /direct/e2e-free-stream (free, no paywall)');
  console.log('  - /direct/e2e-paid-stream ($4.99 paywall)');
  console.log('  - /direct/e2e-premium-stream ($9.99 paywall)');
}

async function cleanup() {
  // Delete test streams
  await prisma.directStream.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX } },
  });

  // Delete test fingerprints
  await prisma.ownerAccountFingerprint.deleteMany({
    where: {
      ownerAccount: {
        contactEmail: { contains: TEST_PREFIX },
      },
    },
  });

  await prisma.deviceFingerprint.deleteMany({
    where: { fingerprintHash: { startsWith: TEST_PREFIX } },
  });

  // Delete test owner users
  await prisma.ownerUser.deleteMany({
    where: { email: { contains: TEST_PREFIX } },
  });

  // Delete test owner accounts
  await prisma.ownerAccount.deleteMany({
    where: { contactEmail: { contains: TEST_PREFIX } },
  });

  console.log('  Cleaned up existing test data');
}

async function createTestOwners(): Promise<Map<string, { accountId: string; userId: string }>> {
  const testOwners: TestOwner[] = [
    {
      email: `${TEST_PREFIX}-coach@fieldview.live`,
      name: 'E2E Test Coach',
      freeGamesUsed: 0,
      subscriptionTier: null,
    },
    {
      email: `${TEST_PREFIX}-school@fieldview.live`,
      name: 'E2E Test School',
      freeGamesUsed: 2,
      subscriptionTier: null,
    },
    {
      email: `${TEST_PREFIX}-limit@fieldview.live`,
      name: 'E2E Test Limit Reached',
      freeGamesUsed: 5, // At limit
      subscriptionTier: null,
    },
    {
      email: `${TEST_PREFIX}-pro@fieldview.live`,
      name: 'E2E Test Pro Subscriber',
      freeGamesUsed: 10,
      subscriptionTier: 'pro',
    },
    {
      email: `${TEST_PREFIX}-abuse-1@fieldview.live`,
      name: 'E2E Test Abuse Account 1',
      freeGamesUsed: 0,
      subscriptionTier: null,
    },
    {
      email: `${TEST_PREFIX}-abuse-2@fieldview.live`,
      name: 'E2E Test Abuse Account 2',
      freeGamesUsed: 0,
      subscriptionTier: null,
    },
  ];

  const ownerMap = new Map<string, { accountId: string; userId: string }>();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const owner of testOwners) {
    const account = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: owner.name,
        status: 'active',
        contactEmail: owner.email,
        freeGamesUsed: owner.freeGamesUsed,
        subscriptionTier: owner.subscriptionTier,
        subscriptionEndsAt: owner.subscriptionTier
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          : null,
      },
    });

    const user = await prisma.ownerUser.create({
      data: {
        ownerAccountId: account.id,
        email: owner.email,
        passwordHash,
        role: 'owner_admin',
        status: 'active',
      },
    });

    ownerMap.set(owner.email, { accountId: account.id, userId: user.id });
    console.log(`  Created: ${owner.email} (${owner.name})`);
  }

  return ownerMap;
}

async function createTestStreams(
  owners: Map<string, { accountId: string; userId: string }>
): Promise<void> {
  const coachAccount = owners.get(`${TEST_PREFIX}-coach@fieldview.live`)!;
  const schoolAccount = owners.get(`${TEST_PREFIX}-school@fieldview.live`)!;
  const proAccount = owners.get(`${TEST_PREFIX}-pro@fieldview.live`)!;

  const testStreams: TestStream[] = [
    {
      slug: `${TEST_PREFIX}-free-stream`,
      title: 'E2E Free Test Stream',
      paywallEnabled: false,
      priceInCents: 0,
      ownerEmail: `${TEST_PREFIX}-coach@fieldview.live`,
    },
    {
      slug: `${TEST_PREFIX}-paid-stream`,
      title: 'E2E Paid Test Stream ($4.99)',
      paywallEnabled: true,
      priceInCents: 499,
      ownerEmail: `${TEST_PREFIX}-school@fieldview.live`,
    },
    {
      slug: `${TEST_PREFIX}-premium-stream`,
      title: 'E2E Premium Test Stream ($9.99)',
      paywallEnabled: true,
      priceInCents: 999,
      ownerEmail: `${TEST_PREFIX}-pro@fieldview.live`,
    },
  ];

  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  for (const stream of testStreams) {
    const owner = owners.get(stream.ownerEmail)!;

    await prisma.directStream.create({
      data: {
        slug: stream.slug,
        title: stream.title,
        ownerAccountId: owner.accountId,
        streamUrl: TEST_HLS_URL,
        paywallEnabled: stream.paywallEnabled,
        priceInCents: stream.priceInCents,
        adminPassword: adminPasswordHash,
        chatEnabled: true,
        scoreboardEnabled: true,
        allowViewerScoreEdit: false,
        allowViewerNameEdit: false,
        allowAnonymousView: !stream.paywallEnabled,
        requireEmailVerification: true,
        listed: true,
        status: 'active',
      },
    });

    console.log(`  Created: /direct/${stream.slug} (${stream.paywallEnabled ? `$${(stream.priceInCents / 100).toFixed(2)}` : 'free'})`);
  }
}

async function createTestFingerprints(
  owners: Map<string, { accountId: string; userId: string }>
): Promise<void> {
  // Create a fingerprint for abuse testing (linked to 2 accounts)
  const abuseFingerprint = await prisma.deviceFingerprint.create({
    data: {
      fingerprintHash: `${TEST_PREFIX}-abuse-fingerprint-${Date.now()}`,
      ipAddresses: ['192.168.1.100', '192.168.1.101'],
      abuseScore: 0,
      warningsShown: 0,
      oneTimePassUsed: false,
    },
  });

  // Link abuse fingerprint to test accounts
  const abuse1 = owners.get(`${TEST_PREFIX}-abuse-1@fieldview.live`)!;
  const abuse2 = owners.get(`${TEST_PREFIX}-abuse-2@fieldview.live`)!;

  await prisma.ownerAccountFingerprint.create({
    data: {
      ownerAccountId: abuse1.accountId,
      deviceFingerprintId: abuseFingerprint.id,
      registrationIp: '192.168.1.100',
    },
  });

  await prisma.ownerAccountFingerprint.create({
    data: {
      ownerAccountId: abuse2.accountId,
      deviceFingerprintId: abuseFingerprint.id,
      registrationIp: '192.168.1.101',
    },
  });

  console.log(`  Created abuse test fingerprint (linked to 2 accounts)`);

  // Create a fingerprint with one-time pass already used
  const usedPassFingerprint = await prisma.deviceFingerprint.create({
    data: {
      fingerprintHash: `${TEST_PREFIX}-used-pass-fingerprint-${Date.now()}`,
      ipAddresses: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
      abuseScore: 80,
      warningsShown: 3,
      oneTimePassUsed: true, // Pass already used
    },
  });

  console.log(`  Created used-pass fingerprint (for final_block testing)`);
}

// Run the seeder
main()
  .catch((error) => {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
