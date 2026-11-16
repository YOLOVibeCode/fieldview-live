/**
 * Verify the Veo camera provider against live Veo, driven only by a seeded
 * `_session` cookie — no browser, no database. Read-only.
 *
 *   COOKIE_FILE=/path/to/cookie [VEO_CLUB_URL=…] npx tsx scripts/verify-veo-http.ts
 */
import * as fs from 'fs';

import { createVeoProvider } from '../src/modules/camera-sources/providers/veo';

async function main(): Promise<void> {
  const cookieFile = process.env.COOKIE_FILE;
  if (!cookieFile) throw new Error('COOKIE_FILE=<path to _session cookie header> required');
  const sessionCookie = fs.readFileSync(cookieFile, 'utf8').trim();
  const clubUrl =
    process.env.VEO_CLUB_URL || 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

  const veo = createVeoProvider();
  const streams = await veo.lister.listLive({
    id: 'verify',
    ownerAccountId: 'verify',
    provider: veo.id,
    config: { clubUrl },
    secrets: { sessionCookie },
  });

  console.log(`live streams (not finished, with a URL): ${streams.length}`);
  for (const s of streams.slice(0, 5)) console.log('  -', s.title, '|', s.streamUrl);
  console.log('\n✅ Veo provider ran against live Veo, cookie-only, no browser.');
}

main().catch((e: unknown) => {
  const err = e as { name?: string; message?: string };
  console.error('ERR', err?.name, err?.message);
  process.exit(1);
});
