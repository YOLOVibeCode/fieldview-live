/**
 * PROOF OF CONCEPT — prove we can log into Veo and read the live stream URL
 * off the streaming-diagnostics page.
 *
 * This is intentionally NOT wired into the app. It is local-only, read-only
 * against Veo, and writes NOTHING to the database. Its whole job is to answer
 * one question: does the real, current Veo site hand us a `stream.mux.com`
 * URL for a live match?
 *
 * It reuses the PRODUCTION parser (PlaywrightVeoDiagnosticsScraper), so a green
 * result here means the production code path works against live Veo.
 *
 * ── One-time setup (local machine — separate from the prod container) ──
 *   cd apps/api && pnpm exec playwright install chromium
 *
 * ── Put creds in apps/api/.env (gitignored — keeps them out of shell history) ──
 *   VEO_EMAIL=you@example.com
 *   VEO_PASSWORD=your-veo-password
 *   VEO_DIAGNOSTICS_URL=https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics
 *
 * ── Run (headed = watch the browser, handle MFA/consent by hand) ──
 *   cd apps/api && HEADED=1 pnpm exec dotenv -e .env -- pnpm exec tsx scripts/poc-veo-scrape.ts
 *
 * Env:
 *   VEO_EMAIL, VEO_PASSWORD   (required)
 *   VEO_DIAGNOSTICS_URL       (default: noctusoft-inc club)
 *   HEADED=1                  show the browser; extends the login wait to 2 min for manual MFA
 *   POC_OUT                   output dir for screenshot + HTML (default ./veo-poc-output)
 */

import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { PlaywrightVeoDiagnosticsScraper } from '../src/modules/veo-scraper/implementations/PlaywrightVeoDiagnosticsScraper';
import type { VeoSession } from '../src/modules/veo-scraper/interfaces';

// Silence the scraper's Gemini fallback (it fires on 0 rows; a bad key just adds noise).
delete process.env.GEMINI_API_KEY;

const LOGIN_URL = 'https://app.veo.co/accounts/login/';
const DEFAULT_DIAG_URL =
  'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

/**
 * Read a .env file LITERALLY — strip one pair of surrounding quotes, but do NOT
 * expand `$VAR` or process escapes. (dotenv-cli expands `$` even inside quotes,
 * which silently corrupts passwords containing `$`.)
 */
function loadEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2];
    const q = val[0];
    if (val.length >= 2 && (q === '"' || q === "'") && val[val.length - 1] === q) {
      val = val.slice(1, -1); // strip one matching quote pair; keep contents verbatim
    } else {
      val = val.replace(/\s+$/, '');
    }
    out[m[1]] = val;
  }
  return out;
}

/** Screenshot + raw HTML of the current page, named <tag>.png / <tag>.html. */
async function snap(page: Page, outDir: string, tag: string): Promise<void> {
  await page.screenshot({ path: path.join(outDir, `${tag}.png`), fullPage: true }).catch(() => {});
  await fs.promises.writeFile(path.join(outDir, `${tag}.html`), await page.content(), 'utf8').catch(() => {});
}

/** Fill the first selector that matches (robust across form variants). */
async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      await loc.fill(value);
      return true;
    }
  }
  return false;
}

async function main(): Promise<void> {
  // Load .env ourselves (literal), preferring any real process.env override.
  const envFile = path.resolve(process.env.POC_ENV || 'apps/api/.env');
  const fileEnv = loadEnvFile(envFile);
  const email = (process.env.VEO_EMAIL || fileEnv.VEO_EMAIL || '').trim();
  const password = process.env.VEO_PASSWORD || fileEnv.VEO_PASSWORD || ''; // literal — no trim
  const diagUrl = (process.env.VEO_DIAGNOSTICS_URL || fileEnv.VEO_DIAGNOSTICS_URL || DEFAULT_DIAG_URL).trim();
  const headed = process.env.HEADED === '1' || process.env.HEADED === 'true';
  const outDir = path.resolve(process.env.POC_OUT || './veo-poc-output');
  console.log('  env file        :', envFile, `(${Object.keys(fileEnv).length} keys read literally)`);

  if (!email || !password) {
    console.error('❌ VEO_EMAIL and VEO_PASSWORD are required (put them in apps/api/.env).');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log('▶ Veo stream-URL PoC');
  console.log('  diagnostics URL :', diagUrl);
  console.log('  mode            :', headed ? 'headed (browser visible)' : 'headless');
  console.log('  artifacts       :', outDir);
  // Masked cred summary — reveals .env truncation/whitespace without leaking secrets.
  const maskEmail = email.length > 6 ? `${email.slice(0, 2)}…${email.slice(email.indexOf('@'))}` : '(short)';
  console.log('  VEO_EMAIL       :', maskEmail, `(len ${email.length})`);
  console.log('  VEO_PASSWORD    : ••• (len', password.length, password.includes('$') ? '— contains "$", now read literally)' : ')');

  const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? 350 : 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1400, height: 900 },
  });

  // ── API DISCOVERY: record the XHR/fetch calls Veo's own frontend makes.
  //    Whatever endpoint feeds the diagnostics page IS the de-facto Veo API. ──
  type NetHit = { method: string; status: number; type: string; url: string; hitFile?: string };
  const netHits: NetHit[] = [];
  let bodyCounter = 0;
  let capturedAuth: string | undefined; // the Bearer the Veo app sends to its own API
  let capturedStreamHistory: { result?: Array<Record<string, any>> } | null = null;
  context.on('response', (response) => {
    void (async () => {
      try {
        const req = response.request();
        const type = req.resourceType();
        const url = response.url();
        if (!capturedAuth && /:\/\/app\.veo\.co\/api\//.test(url)) {
          const h = req.headers()['authorization'];
          if (h) capturedAuth = h;
        }
        if (!capturedStreamHistory && /\/api\/v2\/live\/stream-history\//.test(url) && response.ok()) {
          capturedStreamHistory = await response.json().catch(() => null);
        }
        const apiish = type === 'xhr' || type === 'fetch' || /\/api\/|graphql|\.veo\.co\/.*\/(stream|club|match|live|diagnost)/i.test(url);
        if (!apiish) return;
        const hit: NetHit = { method: req.method(), status: response.status(), type, url };
        const ct = (response.headers()['content-type'] || '').toLowerCase();
        if (ct.includes('json') || ct.includes('text')) {
          const body = await response.text().catch(() => '');
          if (/mux|m3u8|stream|playback|diagnost/i.test(body)) {
            const f = path.join(outDir, `api-body-${++bodyCounter}.json`);
            await fs.promises.writeFile(f, body.slice(0, 300_000), 'utf8').catch(() => {});
            hit.hitFile = path.basename(f);
          }
        }
        netHits.push(hit);
      } catch { /* ignore body-read races */ }
    })();
  });

  const dumpNetwork = async (): Promise<void> => {
    const lines = netHits.map(
      (h) => `${h.status} ${h.method.padEnd(4)} ${h.type.padEnd(5)} ${h.hitFile ? '★' : ' '} ${h.url}${h.hitFile ? '  -> ' + h.hitFile : ''}`,
    );
    await fs.promises.writeFile(path.join(outDir, 'network-requests.txt'), lines.join('\n'), 'utf8').catch(() => {});
    const starred = netHits.filter((h) => h.hitFile);
    console.log(`\n④ API discovery: ${netHits.length} XHR/fetch call(s) captured → network-requests.txt`);
    if (starred.length) {
      console.log(`   ★ ${starred.length} response(s) carried stream/mux/playback data — these ARE the API:`);
      for (const h of starred) console.log(`     ${h.method} ${h.url}  (body → ${h.hitFile})`);
      console.log('   → If one is a clean JSON endpoint, we call it directly instead of scraping HTML.');
    } else if (netHits.length) {
      console.log('   (none of the JSON responses mentioned mux/m3u8 — likely server-rendered HTML → scraping)');
    }
    const endpoints = [
      ...new Set(
        netHits.map((h) => {
          try {
            const u = new URL(h.url);
            return u.host + u.pathname.replace(/\/[0-9A-Za-z_-]{8,}/g, '/:id');
          } catch {
            return h.url;
          }
        }),
      ),
    ];
    if (endpoints.length) {
      console.log('   Distinct endpoints touched:');
      endpoints.slice(0, 40).forEach((e) => console.log('     -', e));
    }
  };

  try {
    const page = await context.newPage();

    // ── ① LOGIN — Veo redirects app.veo.co → auth.veo.co (OIDC). Single-step
    //    email+password form (name=username / name=password / "Login" button). ──
    console.log('\n① Logging in — starting at', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    console.log('   form settled on', page.url());
    await snap(page, outDir, 'login-form');

    const gotEmail = await fillFirst(page, ['input[name="username"]', 'input#email', 'input[type="email"]'], email);
    const gotPass = await fillFirst(page, ['input[name="password"]', 'input[type="password"]'], password);
    if (!gotEmail || !gotPass) {
      await snap(page, outDir, 'login-fields-missing');
      throw new Error(`Could not find login fields (email=${gotEmail}, password=${gotPass}) — see login-fields-missing.*`);
    }

    await page.getByRole('button', { name: /login|log in|sign in/i }).first().click();

    // headed: allow time to complete MFA/consent by hand
    await page.waitForLoadState('networkidle', { timeout: headed ? 120_000 : 25_000 }).catch(() => {});
    await snap(page, outDir, 'login-result');

    // Honest success/failure detection (the old !pathname.includes('/accounts/login')
    // check was fooled by the auth.veo.co error redirect).
    const landedUrl = page.url();
    let errParam: string | null = null;
    try {
      errParam = new URL(landedUrl).searchParams.get('errorMessage');
    } catch { /* not a parseable URL */ }
    const errText = await page
      .locator('text=/unable to log in|invalid|incorrect|couldn.?t|not recogn/i')
      .first()
      .count()
      .catch(() => 0);
    const stillOnAuth = /auth\.veo\.co|\/accounts\/login|\/login|\/interaction\//.test(landedUrl);
    const loginFailed = !!errParam || errText > 0 || stillOnAuth;

    if (loginFailed) {
      let decoded = errParam ?? '';
      try { decoded = errParam ? JSON.parse(decodeURIComponent(errParam)) : ''; } catch { /* keep raw */ }
      console.error('   ✗ Login FAILED. Landed on:', landedUrl);
      if (errParam) console.error('     Veo error:', typeof decoded === 'string' ? decoded : JSON.stringify(decoded));
      console.error('     See login-result.png / login-result.html for the exact screen.');
      throw new Error('Veo rejected the login (credentials or an extra step).');
    }
    console.log('   ✓ Login OK — landed on', landedUrl);

    // ── ② CAPTURE the diagnostics page so failures are inspectable ──
    console.log('\n② Loading the diagnostics page…');
    await page.goto(diagUrl, { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('table tbody tr', { timeout: 15_000 })
      .catch(() => console.warn('   ⚠ No table rows within 15s — structure may have changed.'));

    const shotPath = path.join(outDir, 'diagnostics.png');
    const htmlPath = path.join(outDir, 'diagnostics.html');
    await page.screenshot({ path: shotPath, fullPage: true });
    fs.writeFileSync(htmlPath, await page.content(), 'utf8');
    console.log('   ✓ screenshot →', shotPath);
    console.log('   ✓ raw HTML   →', htmlPath);

    // Let the page's data-fetching XHRs settle so the recorder captures the streams API.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Same session, no extra login: also visit the club's live page (derived from the
    // diagnostics URL). It lists live matches and usually hits the same streams API,
    // widening our "easiest way to get the stream" coverage.
    try {
      const liveUrl = diagUrl.replace(/\/streaming-diagnostics\/?$/, '');
      if (liveUrl && liveUrl !== diagUrl) {
        console.log('   ↪ also visiting club live page:', liveUrl);
        await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await snap(page, outDir, 'club-live');
      }
    } catch { /* non-fatal — the diagnostics page is the primary source */ }

    // ── ③ PARSE with the PRODUCTION scraper (validates the real column parser) ──
    console.log('\n③ Parsing with the production PlaywrightVeoDiagnosticsScraper…');
    const session: VeoSession = { context };
    const rows = await new PlaywrightVeoDiagnosticsScraper().scrape(session, diagUrl);

    console.log(`\n──────── RESULT: ${rows.length} row(s) parsed ────────`);
    if (rows.length === 0) {
      console.log('⚠ Zero rows. Open diagnostics.html / diagnostics.png above.');
      console.log('  If the table clearly has rows, the hard-coded column indices');
      console.log('  in PlaywrightVeoDiagnosticsScraper need adjusting to match.');
    }
    for (const r of rows) {
      console.log(`${r.streamUrl ? '🟢' : '⚪'} [${r.status || '?'}] ${r.matchName || '(no name)'}`);
      console.log(`     stream: ${r.streamUrl ?? '— none —'}`);
    }

    const playable = rows.filter((r) => r.streamUrl);
    console.log(`\n(HTML scraper: ${playable.length} row(s) — expected 0, the page is an SPA.)`);

    // ── ③b THE RECOMMENDED PATH (A): read the stream-history JSON the SPA already
    //    fetched with its own auth (robust — no token replay). ──
    console.log('\n③b Stream-history JSON (captured from the app’s authenticated fetch):');
    if (!capturedStreamHistory) {
      console.log('   Not captured this run — the app did not fetch it, or it 401’d.');
      console.log('   (Rerun; the /clubs/<club>/live navigation should trigger it.)');
    } else {
      const results = Array.isArray(capturedStreamHistory.result) ? capturedStreamHistory.result : [];
      const mapped = results.map((r) => {
        const a = (r.additional_info ?? {}) as Record<string, any>;
        return {
          status: a.status as string | undefined,
          home: a.home_team as string | undefined,
          away: a.away_team as string | undefined,
          link: a.broadcast_link as string | undefined,
        };
      });
      const live = mapped.filter((m) => m.status && m.status !== 'finished');
      console.log(`   ${results.length} stream(s); ${live.length} not "finished".`);
      for (const m of mapped.slice(0, 5)) {
        console.log(`     ${m.status === 'finished' ? '✔' : '🔴'} [${m.status}] ${m.home ?? '?'} vs ${m.away ?? '?'}`);
        console.log(`        ${m.link ?? '(no broadcast_link)'}`);
      }
      if (live.length && live[0].link) {
        console.log(`\n   🔴 LIVE NOW → paste into FieldView: ${live[0].link}`);
        console.log('   ✅ Path A proven end-to-end: login → capture JSON → live Mux URL.');
      } else if (mapped[0]?.link) {
        console.log('\n   (nothing live now) newest broadcast_link:', mapped[0].link);
        console.log('   ✅ Path A wiring proven — rerun during a live match to catch a 🔴 entry.');
      }
    }
  } finally {
    // Always dump the API map — even on a failed login it shows the auth/OIDC endpoints.
    await dumpNetwork().catch(() => {});
    if (headed) {
      console.log('\n(Headed: leaving the window open 20s so you can look around…)');
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
    await browser.close();
  }
}

main().catch((e) => {
  console.error('\n❌ PoC failed:', (e as Error)?.message || e);
  process.exit(1);
});
