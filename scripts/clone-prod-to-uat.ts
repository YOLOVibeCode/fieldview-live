/**
 * Clone PRODUCTION data into UAT, then anonymize PII and repoint payments to sandbox.
 *
 * Two stages:
 *   1. Structural clone (opt-in, RUN_STRUCTURAL_CLONE=1): pg_dump PROD_DATABASE_URL | psql DATABASE_URL.
 *      Requires the postgres client tools (pg_dump/psql) and BOTH public connection strings.
 *      Run this from an operator machine or a Railway one-off that has pg tools installed.
 *   2. Anonymize (always): Prisma updateMany over PII/secret columns + delete ephemeral token rows.
 *
 * Payments: every prod recipient key / Square token is invalid against the UAT sandbox relay
 * product, so we NULL them. Reconnect a sandbox coach via /owners/payments in UAT afterwards.
 *
 * SAFETY (all enforced):
 *   - Refuses unless APP_ENV=uat (never runs against prod/dev by accident).
 *   - Refuses if DATABASE_URL === PROD_DATABASE_URL.
 *   - Requires CONFIRM_CLONE=uat to proceed.
 *
 * Usage:
 *   APP_ENV=uat CONFIRM_CLONE=uat \
 *   PROD_DATABASE_URL="postgresql://…prod…" DATABASE_URL="postgresql://…uat…" \
 *   RUN_STRUCTURAL_CLONE=1 UAT_ADMIN_PASSWORD="…" UAT_OWNER_PASSWORD="…" \
 *   pnpm exec tsx scripts/clone-prod-to-uat.ts
 */

import { execFileSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const APP_ENV = (process.env.APP_ENV || '').toLowerCase();
const TARGET = process.env.DATABASE_URL || '';
const SOURCE = process.env.PROD_DATABASE_URL || '';

function guard() {
  if (APP_ENV !== 'uat') throw new Error(`Refusing: APP_ENV must be "uat" (got "${APP_ENV || 'unset'}").`);
  if (process.env.CONFIRM_CLONE !== 'uat') throw new Error('Refusing: set CONFIRM_CLONE=uat to proceed.');
  if (!TARGET) throw new Error('DATABASE_URL (UAT target) is required.');
  if (SOURCE && SOURCE === TARGET) throw new Error('Refusing: PROD_DATABASE_URL === DATABASE_URL (would clone onto itself).');
}

function structuralClone() {
  if (process.env.RUN_STRUCTURAL_CLONE !== '1') {
    console.log('↷ Skipping structural clone (set RUN_STRUCTURAL_CLONE=1 to enable). Anonymizing existing UAT data.');
    return;
  }
  if (!SOURCE) throw new Error('RUN_STRUCTURAL_CLONE=1 requires PROD_DATABASE_URL.');
  console.log('⧉ Structural clone: pg_dump PROD → psql UAT (this DROPS and recreates the public schema on UAT)...');
  // Reset target schema, then stream a data+schema dump. --no-owner/--no-acl for cross-instance restore.
  execFileSync('psql', [TARGET, '-v', 'ON_ERROR_STOP=1', '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'], { stdio: 'inherit' });
  const dump = execFileSync('pg_dump', ['--no-owner', '--no-acl', '--format=plain', SOURCE], { maxBuffer: 1024 * 1024 * 1024 });
  execFileSync('psql', [TARGET, '-v', 'ON_ERROR_STOP=1'], { input: dump, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('✔ Structural clone complete.');
}

async function anonymize() {
  const prisma = new PrismaClient();
  try {
    const uatOwnerHash = await bcrypt.hash(process.env.UAT_OWNER_PASSWORD || 'uatowner123', 10);
    const uatAdminHash = await bcrypt.hash(process.env.UAT_ADMIN_PASSWORD || 'uatadmin123', 10);

    console.log('🔒 Anonymizing PII + repointing payments to sandbox...');

    // --- Owners: mask identity, NULL all Square/relay payment state (invalid vs sandbox) ---
    const owners = await prisma.ownerAccount.findMany({ select: { id: true } });
    for (const { id } of owners) {
      await prisma.ownerAccount.update({
        where: { id },
        data: {
          name: `UAT Owner ${id.slice(0, 8)}`,
          contactEmail: `owner+${id.slice(0, 8)}@uat.fieldview.live`,
          payoutProviderRef: null,
          squareAccessTokenEncrypted: null,
          squareRefreshTokenEncrypted: null,
          squareTokenExpiresAt: null,
          squareLocationId: null,
          relayRecipientKey: null,
          paymentsConnectedAt: null,
          agreementAcceptedVersion: null,
        },
      });
    }
    console.log(`  owners anonymized: ${owners.length}`);

    // --- Owner users: mask email, reset password, clear MFA ---
    const ownerUsers = await prisma.ownerUser.findMany({ select: { id: true } });
    for (const { id } of ownerUsers) {
      await prisma.ownerUser.update({
        where: { id },
        data: { email: `owneruser+${id.slice(0, 8)}@uat.fieldview.live`, passwordHash: uatOwnerHash, mfaSecret: null },
      });
    }
    console.log(`  owner users anonymized: ${ownerUsers.length}`);

    // --- Admins: mask, reset password, clear MFA ---
    const admins = await prisma.adminAccount.findMany({ select: { id: true, role: true } });
    for (const a of admins) {
      await prisma.adminAccount.update({
        where: { id: a.id },
        data: { email: `admin+${a.id.slice(0, 8)}@uat.fieldview.live`, passwordHash: uatAdminHash, mfaSecret: null, mfaEnabled: false },
      });
    }
    console.log(`  admins anonymized: ${admins.length} (a known UAT super_admin is re-seeded by seed-dev if needed)`);

    // --- Viewer identities: mask contact info, clear tokens ---
    const viewers = await prisma.viewerIdentity.findMany({ select: { id: true } });
    for (const { id } of viewers) {
      await prisma.viewerIdentity.update({
        where: { id },
        data: {
          email: `viewer+${id.slice(0, 8)}@uat.fieldview.live`,
          phoneE164: null,
          firstName: 'UAT',
          lastName: `Viewer ${id.slice(0, 6)}`,
        },
      });
    }
    console.log(`  viewers anonymized: ${viewers.length}`);

    // --- Payment identifiers that reference prod Square (unusable in sandbox) ---
    await prisma.viewerSquareCustomer.deleteMany({});
    await prisma.purchase.updateMany({ data: { lastAccessedIp: null } });
    await prisma.payout.updateMany({ data: { payoutProviderRef: null } });

    // --- Veo credentials ---
    await prisma.veoIntegration.updateMany({ data: { veoEmail: null, veoPasswordEncrypted: null } });

    // --- Ephemeral token/secret tables: delete outright (they regenerate) ---
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.viewerRefreshToken.deleteMany({});
    await prisma.sMSMessage.deleteMany({});
    await prisma.earlyAccessSignup.deleteMany({});
    console.log('  cleared ephemeral token/secret tables (email/password/refresh tokens, SMS, early-access signups)');

    console.log('\n✅ Anonymize complete. Reconnect a sandbox coach via /owners/payments in UAT.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  guard();
  structuralClone();
  await anonymize();
}

main().catch((e) => {
  console.error('❌ clone-prod-to-uat failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
