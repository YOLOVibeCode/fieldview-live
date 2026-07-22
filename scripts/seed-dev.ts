/**
 * DEV / non-prod seed.
 *
 * Creates a minimal, idempotent dataset for the DEVELOPMENT (and UAT-fresh) tiers:
 *   - super_admin  (admin@fieldview.live)               — password from ADMIN_PASSWORD (default dev value)
 *   - a test owner (dev-owner@fieldview.live)           — ready to connect Square SANDBOX via /owners/payments
 *   - a free demo stream + a paywalled demo stream       — for the relay sandbox charge canary
 *
 * Payments note: the owner is created WITHOUT a relayRecipientKey on purpose — a real
 * sandbox coach connection happens through the UI (/owners/payments → agreement → Square
 * OAuth), which is what sets relayRecipientKey + paymentsConnectedAt. A fabricated key
 * would have no Square tokens behind it and could not charge.
 *
 * Safety: refuses to run when APP_ENV=production. Idempotent (upserts by email/slug).
 *
 * Usage: DATABASE_URL="postgresql://..." ADMIN_PASSWORD="..." pnpm exec tsx scripts/seed-dev.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const APP_ENV = (process.env.APP_ENV || '').toLowerCase();
const ADMIN_EMAIL = 'admin@fieldview.live';
const OWNER_EMAIL = 'dev-owner@fieldview.live';
const DEV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'devadmin123';
const DEV_OWNER_PASSWORD = process.env.DEV_OWNER_PASSWORD || 'devowner123';
const DEMO_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

async function ensureSuperAdmin() {
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);
  await prisma.adminAccount.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, status: 'active' },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'super_admin',
      status: 'active',
      mfaEnabled: false,
    },
  });
  console.log(`  super_admin ready: ${ADMIN_EMAIL}`);
}

async function ensureOwner(): Promise<string> {
  const existing = await prisma.ownerAccount.findFirst({ where: { contactEmail: OWNER_EMAIL } });
  const account =
    existing ??
    (await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Dev Test Coach',
        status: 'active',
        contactEmail: OWNER_EMAIL,
        freeGamesUsed: 0,
        subscriptionTier: null,
        // relayRecipientKey intentionally null — connect Square sandbox via /owners/payments.
      },
    }));

  const ownerPasswordHash = await bcrypt.hash(DEV_OWNER_PASSWORD, 10);
  const user = await prisma.ownerUser.findFirst({ where: { email: OWNER_EMAIL } });
  if (user) {
    await prisma.ownerUser.update({ where: { id: user.id }, data: { passwordHash: ownerPasswordHash, status: 'active' } });
  } else {
    await prisma.ownerUser.create({
      data: {
        ownerAccountId: account.id,
        email: OWNER_EMAIL,
        passwordHash: ownerPasswordHash,
        role: 'owner_admin',
        status: 'active',
      },
    });
  }
  console.log(`  owner ready: ${OWNER_EMAIL} (account ${account.id})`);
  return account.id;
}

async function ensureStreams(ownerAccountId: string) {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const streams = [
    { slug: 'dev-free-stream', title: 'Dev Free Stream', paywallEnabled: false, priceInCents: 0 },
    { slug: 'dev-paid-stream', title: 'Dev Paid Stream ($1.00 sandbox)', paywallEnabled: true, priceInCents: 100 },
  ];
  for (const s of streams) {
    const existing = await prisma.directStream.findUnique({ where: { slug: s.slug } });
    const data = {
      title: s.title,
      ownerAccountId,
      streamUrl: DEMO_HLS_URL,
      paywallEnabled: s.paywallEnabled,
      priceInCents: s.priceInCents,
      adminPassword,
      chatEnabled: true,
      scoreboardEnabled: true,
      allowViewerScoreEdit: false,
      allowViewerNameEdit: false,
      allowAnonymousView: !s.paywallEnabled,
      requireEmailVerification: true,
      listed: true,
      status: 'active',
    };
    if (existing) {
      await prisma.directStream.update({ where: { slug: s.slug }, data });
    } else {
      await prisma.directStream.create({ data: { slug: s.slug, ...data } });
    }
    console.log(`  stream ready: /direct/${s.slug} (${s.paywallEnabled ? `$${(s.priceInCents / 100).toFixed(2)}` : 'free'})`);
  }
}

async function main() {
  if (APP_ENV === 'production') {
    console.error('Refusing to seed: APP_ENV=production. This script is for DEV/UAT only.');
    process.exit(1);
  }
  console.log(`🌱 Seeding DEV data (APP_ENV=${APP_ENV || 'unset'})...`);
  await ensureSuperAdmin();
  const ownerAccountId = await ensureOwner();
  await ensureStreams(ownerAccountId);
  console.log('\n✅ DEV seed complete.');
  console.log(`   admin login: ${ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD}`);
  console.log(`   owner login: ${OWNER_EMAIL} / ${DEV_OWNER_PASSWORD}`);
  console.log('   → connect Square SANDBOX at /owners/payments to arm the payment canary.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
