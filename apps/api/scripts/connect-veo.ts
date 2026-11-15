/**
 * Connect (or reconnect) an owner's Veo camera source and store it encrypted.
 *
 * Runs the one-time Veo browser login on THIS machine (needs Chromium here, never
 * on the server), or takes an already-captured session cookie from COOKIE_FILE.
 * It goes through the same connector the app uses, so the session is verified
 * against Veo before anything is stored. The password is used once and not kept.
 *
 * Usage (from apps/api, with DATABASE_URL and ENCRYPTION_KEY for the target env set):
 *   OWNER_EMAIL=owner@example.com VEO_EMAIL=coach@example.com \
 *   VEO_CLUB_URL=https://app.veo.co/clubs/<club>/live/streaming-diagnostics \
 *   VEO_PASSWORD='…' npx tsx scripts/connect-veo.ts
 *
 *   Use COOKIE_FILE=/path/to/cookie instead of VEO_PASSWORD to skip the browser.
 *   Pass VEO_PASSWORD literally: dotenv-cli expands `$` and corrupts it.
 */
import * as fs from 'fs';

import { prisma } from '../src/lib/prisma';
import { sealSecrets } from '../src/modules/camera-sources/secrets';
import { createVeoProvider } from '../src/modules/camera-sources/providers/veo';
import { PlaywrightVeoLogin } from '../src/modules/camera-sources/providers/veo/browser/PlaywrightVeoLogin';
import { VeoCookieSeeder } from '../src/modules/camera-sources/providers/veo/browser/VeoCookieSeeder';
import { CameraSourceRepository } from '../src/repositories/implementations/CameraSourceRepository';

function required(name: string): string {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function resolveOwnerAccountId(): Promise<string> {
  const byId = process.env.OWNER_ACCOUNT_ID?.trim();
  if (byId) return byId;
  const email = required('OWNER_EMAIL');
  const user = await prisma.ownerUser.findUnique({ where: { email }, select: { ownerAccountId: true } });
  if (!user) throw new Error(`No owner user with email ${email}`);
  return user.ownerAccountId;
}

async function main(): Promise<void> {
  const input: Record<string, string> = { email: required('VEO_EMAIL'), clubUrl: required('VEO_CLUB_URL') };
  const cookieFile = process.env.COOKIE_FILE?.trim();
  if (cookieFile) {
    input.sessionCookie = fs.readFileSync(cookieFile, 'utf8').trim();
  } else {
    input.password = process.env.VEO_PASSWORD || ''; // literal: may contain `$`
    if (!input.password) throw new Error('VEO_PASSWORD or COOKIE_FILE is required');
  }

  const ownerAccountId = await resolveOwnerAccountId();
  const veo = createVeoProvider({ sessionSeeder: new VeoCookieSeeder(new PlaywrightVeoLogin()) });

  console.log(`Connecting ${veo.displayName} for owner ${ownerAccountId}${cookieFile ? '' : ' (browser login)'}…`);
  const result = await veo.connector.connect(input);

  const saved = await new CameraSourceRepository(prisma).upsert({
    ownerAccountId,
    provider: veo.id,
    config: result.config,
    secrets: sealSecrets(result.secrets),
  });
  console.log(`✅ ${veo.displayName} connected and verified (camera source ${saved.id}, status ${saved.status}).`);
}

main()
  .catch((e: unknown) => {
    const err = e as { name?: string; message?: string };
    console.error('ERR', err?.name, err?.message);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
