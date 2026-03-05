/**
 * Ensure owner account exists for the given email, tie DirectStreams to them, store Veo integration.
 *
 * Local (uses .env DATABASE_URL):
 *   cd apps/api && OWNER_EMAIL=... OWNER_PASSWORD=... VEO_PASSWORD=... pnpm exec dotenv -e .env -- tsx scripts/ensure-veo-owner-and-integration.ts
 *
 * Production (Railway): Use the public database URL from Railway (Postgres service → Connect → Public).
 *   Ensure migration is applied first: DATABASE_URL=<public_url> pnpm run db:migrate (from apps/api with dotenv).
 *   Then: DATABASE_URL=<public_url> OWNER_EMAIL=... OWNER_PASSWORD=... VEO_PASSWORD=... pnpm exec tsx scripts/ensure-veo-owner-and-integration.ts
 *
 * Required env when creating owner: OWNER_EMAIL, OWNER_PASSWORD, VEO_PASSWORD.
 * Optional: VEO_DIAGNOSTICS_URL (default: noctusoft-inc streaming-diagnostics URL).
 *
 * If owner exists: upserts VeoIntegration. If not: creates OwnerAccount, OwnerUser, VeoIntegration, and default DirectStream (slug: noctusoft).
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { encrypt } from '../src/lib/encryption';
import { hashPassword } from '../src/lib/encryption';

const DEFAULT_OWNER_EMAIL = 'rvegajr@noctusoft.com';
const DEFAULT_VEO_DIAGNOSTICS_URL =
  'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';
const DEFAULT_DIRECT_STREAM_SLUG = 'noctusoft';

async function main(): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD?.trim();
  const veoPassword = process.env.VEO_PASSWORD?.trim();
  const veoDiagnosticsUrl =
    process.env.VEO_DIAGNOSTICS_URL?.trim() || DEFAULT_VEO_DIAGNOSTICS_URL;

  console.log('Checking database for owner:', ownerEmail);

  let ownerUser = await prisma.ownerUser.findUnique({
    where: { email: ownerEmail },
    include: { ownerAccount: true },
  });

  if (ownerUser) {
    console.log('Found existing owner account:', ownerUser.ownerAccountId);
    if (veoPassword) {
      const encrypted = encrypt(veoPassword);
      await prisma.veoIntegration.upsert({
        where: { ownerAccountId: ownerUser.ownerAccountId },
        create: {
          ownerAccountId: ownerUser.ownerAccountId,
          veoEmail: ownerEmail,
          veoPasswordEncrypted: encrypted,
          veoDiagnosticsUrl,
        },
        update: {
          veoEmail: ownerEmail,
          veoPasswordEncrypted: encrypted,
          veoDiagnosticsUrl,
        },
      });
      console.log('Veo integration updated for this owner.');
    } else {
      console.log('VEO_PASSWORD not set; skipping Veo integration update.');
    }
    printOwnerAccountId(ownerUser.ownerAccountId);
    return;
  }

  if (!ownerPassword) {
    console.error(
      'Owner not found and OWNER_PASSWORD is required to create one. Set OWNER_EMAIL and OWNER_PASSWORD.'
    );
    process.exit(1);
  }
  if (!veoPassword) {
    console.error(
      'VEO_PASSWORD is required when creating a new owner (to store Veo integration).'
    );
    process.exit(1);
  }

  console.log('Creating owner account, user, Veo integration, and default direct stream...');

  const passwordHash = await hashPassword(ownerPassword);
  const adminPasswordHash = await bcrypt.hash('changeme-admin', 10);

  const ownerAccount = await prisma.ownerAccount.create({
    data: {
      type: 'owner',
      name: 'Noctusoft (Veo)',
      status: 'active',
      contactEmail: ownerEmail,
    },
  });

  await prisma.ownerUser.create({
    data: {
      ownerAccountId: ownerAccount.id,
      email: ownerEmail,
      passwordHash,
      role: 'owner_admin',
      status: 'active',
    },
  });

  await prisma.veoIntegration.create({
    data: {
      ownerAccountId: ownerAccount.id,
      veoEmail: ownerEmail,
      veoPasswordEncrypted: encrypt(veoPassword),
      veoDiagnosticsUrl,
    },
  });

  const existingStream = await prisma.directStream.findUnique({
    where: { slug: DEFAULT_DIRECT_STREAM_SLUG },
  });

  if (!existingStream) {
    await prisma.directStream.create({
      data: {
        slug: DEFAULT_DIRECT_STREAM_SLUG,
        title: 'Noctusoft Live Stream',
        ownerAccountId: ownerAccount.id,
        adminPassword: adminPasswordHash,
      },
    });
    console.log('Created default direct stream:', DEFAULT_DIRECT_STREAM_SLUG);
  } else {
    await prisma.directStream.update({
      where: { id: existingStream.id },
      data: { ownerAccountId: ownerAccount.id },
    });
    console.log('Tied existing direct stream to this owner:', existingStream.slug);
  }

  console.log('Owner account created.');
  printOwnerAccountId(ownerAccount.id);
}

function printOwnerAccountId(id: string): void {
  console.log('\n---');
  console.log('VEO_OWNER_ACCOUNT_ID (add to .env or Railway):');
  console.log(id);
  console.log('---');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
