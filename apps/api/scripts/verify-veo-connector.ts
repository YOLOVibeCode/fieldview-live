/**
 * Verify the PRODUCTION Veo connector end-to-end against live Veo:
 *   PlaywrightVeoAuthenticator (login) → PlaywrightVeoLiveApiScraper (capture JSON).
 * Local, read-only, no DB writes. Confirms the refactor works in the shipped code path.
 *
 * Run (email inline is fine — not secret; password read literally from apps/api/.env):
 *   VEO_EMAIL=rvegajr@noctusoft.com npx tsx apps/api/scripts/verify-veo-connector.ts
 */
import fs from 'fs';
import path from 'path';
import { PlaywrightVeoAuthenticator } from '../src/modules/veo-scraper/implementations/PlaywrightVeoAuthenticator';
import { PlaywrightVeoLiveApiScraper } from '../src/modules/veo-scraper/implementations/PlaywrightVeoLiveApiScraper';

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { return out; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    const q = v[0];
    if (v.length >= 2 && (q === '"' || q === "'") && v[v.length - 1] === q) v = v.slice(1, -1);
    else v = v.replace(/\s+$/, '');
    out[m[1]] = v;
  }
  return out;
}

async function main(): Promise<void> {
  const env = loadEnv(path.resolve('apps/api/.env'));
  const email = (process.env.VEO_EMAIL || env.VEO_EMAIL || '').trim();
  const password = process.env.VEO_PASSWORD || env.VEO_PASSWORD || '';
  const diagUrl =
    (process.env.VEO_DIAGNOSTICS_URL || env.VEO_DIAGNOSTICS_URL ||
      'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics').trim();
  if (!email || !password) {
    console.error('❌ Need VEO_EMAIL + VEO_PASSWORD (apps/api/.env).');
    process.exit(1);
  }

  const auth = new PlaywrightVeoAuthenticator();
  const scraper = new PlaywrightVeoLiveApiScraper();

  console.log('① PlaywrightVeoAuthenticator.login …');
  const session = await auth.login({ email, password });
  console.log('   ✓ login succeeded (auth-detection fix works)');

  try {
    console.log('② PlaywrightVeoLiveApiScraper.scrape …  (watch the log line below)');
    const rows = await scraper.scrape(session, diagUrl);
    console.log(`   scrape returned ${rows.length} LIVE row(s):`);
    for (const r of rows) console.log(`     🔴 [${r.status}] ${r.matchName} → ${r.streamUrl}`);
    if (rows.length === 0) {
      console.log('   (0 live rows — correct when nothing is streaming; finished streams are filtered out.');
      console.log('    A "captured live streams" log above = capture worked. "not captured" = capture failed.)');
    }
  } finally {
    await auth.logout(session);
    console.log('③ logout — browser closed.');
  }
}

main().catch((e) => {
  console.error('❌ verify failed:', (e as Error).message);
  process.exit(1);
});
