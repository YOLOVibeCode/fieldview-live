/**
 * Verify the BROWSER-FREE Veo HTTP connector against live Veo.
 *
 * Exercises the real production classes (HttpVeoAuthenticator + HttpVeoStreamScraper
 * + HttpVeoStreamHistoryClient) driven only by a seeded `_session` cookie — no browser.
 *
 *   COOKIE_FILE=/path/to/cookie [VEO_DIAGNOSTICS_URL=…] npx tsx scripts/verify-veo-http.ts
 */
import * as fs from 'fs';

import { HttpVeoAuthenticator } from '../src/modules/veo-scraper/implementations/HttpVeoAuthenticator';
import { HttpVeoStreamHistoryClient } from '../src/modules/veo-scraper/implementations/HttpVeoStreamHistoryClient';
import { HttpVeoStreamScraper } from '../src/modules/veo-scraper/implementations/HttpVeoStreamScraper';
import type { FetchLike } from '../src/modules/veo-scraper/interfaces';

async function main(): Promise<void> {
  const cookieFile = process.env.COOKIE_FILE;
  if (!cookieFile) throw new Error('COOKIE_FILE=<path to _session cookie header> required');
  const sessionCookie = fs.readFileSync(cookieFile, 'utf8').trim();
  const diagnosticsUrl =
    process.env.VEO_DIAGNOSTICS_URL ||
    'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

  const auth = new HttpVeoAuthenticator();
  const scraper = new HttpVeoStreamScraper({
    streamClient: new HttpVeoStreamHistoryClient({ fetch: globalThis.fetch as unknown as FetchLike }),
  });

  const session = await auth.login({ email: '', password: '', sessionCookie });
  const rows = await scraper.scrape(session, diagnosticsUrl);
  await auth.logout(session);

  console.log(`live rows (status !== 'finished' && has url): ${rows.length}`);
  for (const r of rows.slice(0, 5)) console.log('  -', r.matchName, '| status', r.status, '|', r.streamUrl);
  console.log('\n✅ Real HTTP connector ran against live Veo, cookie-only, no browser.');
}

main().catch((e: unknown) => {
  const err = e as { name?: string; message?: string };
  console.error('ERR', err?.name, err?.message);
  process.exit(1);
});
