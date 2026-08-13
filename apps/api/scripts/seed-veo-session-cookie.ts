/**
 * Seed a VeoIntegration's browser-free credential.
 *
 * Runs the ONE-TIME Veo browser login (locally — needs Chromium on THIS machine,
 * not in prod), captures the `auth.veo.co` `_session` cookie, encrypts it, and
 * stores it on VeoIntegration.veoSessionCookieEncrypted. After this the prod
 * connector runs pure HTTP (VEO_HTTP_MODE) with no Chromium in the container.
 *
 * Usage (email inline to avoid dotenv `$` corruption; password read from .env):
 *   VEO_EMAIL=rvegajr@noctusoft.com \
 *   [VEO_OWNER_ACCOUNT_ID=<uuid>] [DATABASE_URL=<target db>] \
 *   pnpm exec dotenv -e .env -- tsx scripts/seed-veo-session-cookie.ts
 */
import { prisma } from '../src/lib/prisma';
import { encrypt } from '../src/lib/encryption';
import { PlaywrightVeoAuthenticator } from '../src/modules/veo-scraper/implementations/PlaywrightVeoAuthenticator';
import { VeoCookieSeeder } from '../src/modules/veo-scraper/implementations/VeoCookieSeeder';

async function main(): Promise<void> {
  const email = (process.env.VEO_EMAIL || '').trim();
  const password = process.env.VEO_PASSWORD || ''; // literal from .env (may contain `$`)
  if (!email || !password) throw new Error('VEO_EMAIL and VEO_PASSWORD are required');

  const ownerAccountId = process.env.VEO_OWNER_ACCOUNT_ID?.trim();
  const integration = ownerAccountId
    ? await prisma.veoIntegration.findUnique({ where: { ownerAccountId } })
    : await prisma.veoIntegration.findFirst();
  if (!integration) {
    throw new Error(
      ownerAccountId
        ? `No VeoIntegration for ownerAccountId=${ownerAccountId}`
        : 'No VeoIntegration found (set VEO_OWNER_ACCOUNT_ID)'
    );
  }

  console.log(`Seeding session cookie for ownerAccountId=${integration.ownerAccountId} (browser login)…`);
  const seeder = new VeoCookieSeeder(new PlaywrightVeoAuthenticator());
  const cookieHeader = await seeder.seed({ email, password });
  console.log(`Captured session cookie (${cookieHeader.length} chars). Encrypting + storing…`);

  await prisma.veoIntegration.update({
    where: { id: integration.id },
    data: { veoSessionCookieEncrypted: encrypt(cookieHeader) },
  });

  console.log('✅ Stored VeoIntegration.veoSessionCookieEncrypted. Prod can now run VEO_HTTP_MODE=true (no Chromium).');
}

main()
  .catch((e: unknown) => {
    const err = e as { name?: string; message?: string };
    console.error('ERR', err?.name, err?.message);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
