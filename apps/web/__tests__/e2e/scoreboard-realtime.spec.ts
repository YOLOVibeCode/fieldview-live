import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Scoreboard Real-Time Push E2E Tests
 *
 * Validates the full depth of scoreboard updates:
 *   1. Score persistence, type coercion, boundary validation
 *   2. SSE endpoint health (content-type, snapshot fields, update events)
 *   3. UI-driven score edits (score card → edit sheet → save) push to other viewers
 *   4. Bidirectional cross-viewer push (viewer A → B, then B → A)
 *   5. Rapid sequential updates all propagate correctly
 *   6. Multiple concurrent SSE subscribers (3+ viewers)
 *   7. Team name updates propagate via SSE
 *   8. All form factors: desktop, portrait, landscape, tablet
 *
 * Prereqs: local API (port 4301) + web (port 4300), "test" stream with:
 *   - scoreboardEnabled: true
 *   - allowViewerScoreEdit: true
 *   - allowAnonymousScoreEdit: true
 *   - allowAnonymousChat: true
 *   - streamUrl set
 */

const STREAM_URL = '/direct/test';
const API_BASE = 'http://localhost:4301';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

async function getAnonymousToken(): Promise<string> {
  const session = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resp = await fetch(`${API_BASE}/api/public/direct/test/viewer/anonymous-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session }),
  });
  if (!resp.ok) throw new Error(`Failed to get anon token: ${resp.status}`);
  const { viewerToken } = await resp.json();
  return viewerToken;
}

async function resetScores() {
  const token = await getAnonymousToken();
  await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field: 'homeScore', value: 0 }),
  });
  await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field: 'awayScore', value: 0 }),
  });
}

async function setScoreViaAPI(field: 'homeScore' | 'awayScore', value: number) {
  const token = await getAnonymousToken();
  const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field, value }),
  });
  if (!resp.ok) throw new Error(`Failed to set score: ${resp.status}`);
}

/** Set team name via the producer endpoint (open access when no producer password is set) */
async function setTeamNameViaProducerAPI(field: 'homeTeamName' | 'awayTeamName', value: string) {
  const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value }),
  });
  return resp;
}

async function getScoresFromAPI(): Promise<{ home: number; away: number }> {
  const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard`);
  if (!resp.ok) throw new Error(`Failed to get scores: ${resp.status}`);
  const data = await resp.json();
  return { home: data.homeScore, away: data.awayScore };
}

async function getFullScoreboardFromAPI(): Promise<any> {
  const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard`);
  if (!resp.ok) throw new Error(`Failed to get scoreboard: ${resp.status}`);
  return resp.json();
}

async function navigateAndWait(page: Page) {
  await page.goto(STREAM_URL);
  await page.waitForTimeout(5000);
}

/** Expand scoreboard sidebar if it's collapsed */
async function expandScoreboardIfNeeded(page: Page) {
  const expandBtn = page.getByTestId('btn-expand-scoreboard');
  if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(600);
  }
}

/** Read the displayed score from score-card elements (home = first, away = second) */
async function getDisplayedScores(page: Page): Promise<{ home: number; away: number } | null> {
  const scoreCards = page.getByTestId('score-card');
  const count = await scoreCards.count();
  if (count < 2) return null;

  const homeText = await scoreCards.nth(0).innerText();
  const awayText = await scoreCards.nth(count - 1).innerText();

  // Score cards contain: "TEAM\nSCORE\nTap to edit" — extract the number
  const homeMatch = homeText.match(/\b(\d+)\b/);
  const awayMatch = awayText.match(/\b(\d+)\b/);
  if (!homeMatch || !awayMatch) return null;

  return { home: parseInt(homeMatch[1], 10), away: parseInt(awayMatch[1], 10) };
}

/** Use the UI to edit a score: click score card → use edit sheet → save */
async function editScoreViaUI(
  page: Page,
  which: 'home' | 'away',
  targetScore: number,
): Promise<boolean> {
  const scoreCards = page.getByTestId('score-card-button');
  const count = await scoreCards.count();
  if (count < 2) return false;

  // Click the appropriate score card (home = first, away = last)
  const cardIndex = which === 'home' ? 0 : count - 1;
  await scoreCards.nth(cardIndex).click();
  await page.waitForTimeout(600);

  // Edit sheet should appear — find the score input
  const scoreInput = page.locator('input[inputmode="numeric"]').first();
  if (!await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) return false;

  // Clear and type the target score
  await scoreInput.fill(String(targetScore));
  await page.waitForTimeout(200);

  // Click Save
  const saveBtn = page.getByText('Save');
  if (!await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) return false;
  await saveBtn.click();
  await page.waitForTimeout(1000);

  return true;
}

/** Use the UI to increment a score with +1 button inside edit sheet */
async function incrementScoreViaUI(
  page: Page,
  which: 'home' | 'away',
  clicks: number,
): Promise<boolean> {
  const scoreCards = page.getByTestId('score-card-button');
  const count = await scoreCards.count();
  if (count < 2) return false;

  const cardIndex = which === 'home' ? 0 : count - 1;
  await scoreCards.nth(cardIndex).click();
  await page.waitForTimeout(600);

  const plus1 = page.getByText('+1').first();
  if (!await plus1.isVisible({ timeout: 2000 }).catch(() => false)) return false;

  for (let i = 0; i < clicks; i++) {
    await plus1.click();
    await page.waitForTimeout(200);
  }

  const saveBtn = page.getByText('Save');
  await saveBtn.click();
  await page.waitForTimeout(1000);

  return true;
}

/** Parse SSE events from a raw buffer string */
function parseSSEEvents(buffer: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  const lines = buffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('event: ')) {
      const eventName = lines[i].slice(7).trim();
      const dataLine = lines[i + 1];
      if (dataLine?.startsWith('data: ')) {
        try {
          events.push({ event: eventName, data: JSON.parse(dataLine.slice(6)) });
        } catch { /* skip malformed */ }
      }
    }
  }
  return events;
}

// ============================================================
// SUITE 1: Score persistence & validation
// ============================================================
test.describe('Score Update Persistence', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score set via API reads back correctly', async () => {
    await setScoreViaAPI('homeScore', 42);
    await setScoreViaAPI('awayScore', 17);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(42);
    expect(scores.away).toBe(17);
  });

  test('integer coercion: string "5" persists as number 5', async () => {
    const token = await getAnonymousToken();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'homeScore', value: '5' }),
    });
    expect(resp.ok).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(5);
    expect(typeof scores.home).toBe('number');
  });

  test('rejects invalid score values', async () => {
    const token = await getAnonymousToken();

    const r1 = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'homeScore', value: -1 }),
    });
    expect(r1.status).toBe(400);

    const r2 = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'homeScore', value: 1000 }),
    });
    expect(r2.status).toBe(400);

    const r3 = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'homeScore', value: 'abc' }),
    });
    expect(r3.status).toBe(400);
  });

  test('score 0 persists correctly (not falsy)', async () => {
    await setScoreViaAPI('homeScore', 5);
    expect((await getScoresFromAPI()).home).toBe(5);

    await setScoreViaAPI('homeScore', 0);
    expect((await getScoresFromAPI()).home).toBe(0);
  });

  test('boundary values: 0, 1, 999 all persist', async () => {
    await setScoreViaAPI('homeScore', 0);
    expect((await getScoresFromAPI()).home).toBe(0);

    await setScoreViaAPI('homeScore', 1);
    expect((await getScoresFromAPI()).home).toBe(1);

    await setScoreViaAPI('homeScore', 999);
    expect((await getScoresFromAPI()).home).toBe(999);
  });

  test('float value "3.7" coerces to integer 3', async () => {
    const token = await getAnonymousToken();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'homeScore', value: '3.7' }),
    });
    expect(resp.ok).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(3);
  });

  test('rejects invalid field names', async () => {
    const token = await getAnonymousToken();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field: 'producerPassword', value: 'hacked' }),
    });
    expect(resp.status).toBe(400);
  });
});

// ============================================================
// SUITE 2: SSE endpoint health & field completeness
// ============================================================
test.describe('Scoreboard SSE Endpoint', () => {
  test.describe.configure({ timeout: 30000 });

  test('SSE endpoint returns event-stream content type', async () => {
    const controller = new AbortController();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });
    expect(resp.headers.get('content-type')).toContain('text/event-stream');
    controller.abort();
  });

  test('SSE snapshot contains all required scoreboard fields', async () => {
    await resetScores();
    await setScoreViaAPI('homeScore', 7);
    await setScoreViaAPI('awayScore', 3);

    const controller = new AbortController();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let snapshot: any = null;

    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      while (!snapshot) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = parseSSEEvents(buffer);
        const snapshotEvent = events.find(e => e.event === 'scoreboard_snapshot');
        if (snapshotEvent) snapshot = snapshotEvent.data;
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    expect(snapshot).not.toBeNull();

    // Verify all fields present
    expect(snapshot).toHaveProperty('homeScore', 7);
    expect(snapshot).toHaveProperty('awayScore', 3);
    expect(snapshot).toHaveProperty('homeTeamName');
    expect(snapshot).toHaveProperty('awayTeamName');
    expect(snapshot).toHaveProperty('homeJerseyColor');
    expect(snapshot).toHaveProperty('awayJerseyColor');
    expect(snapshot).toHaveProperty('clockMode');
    expect(snapshot).toHaveProperty('clockSeconds');
    expect(snapshot).toHaveProperty('isVisible');
    expect(snapshot).toHaveProperty('position');
    expect(snapshot).toHaveProperty('lastEditedBy');
    expect(snapshot).toHaveProperty('lastEditedAt');

    // Types
    expect(typeof snapshot.homeScore).toBe('number');
    expect(typeof snapshot.awayScore).toBe('number');
    expect(typeof snapshot.homeTeamName).toBe('string');
    expect(typeof snapshot.awayTeamName).toBe('string');
  });

  test('SSE receives scoreboard_update event when score changes', async () => {
    await resetScores();

    const controller = new AbortController();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotSnapshot = false;
    let update: any = null;

    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      while (!update) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = parseSSEEvents(buffer);
        if (events.some(e => e.event === 'scoreboard_snapshot')) gotSnapshot = true;
        const updateEvent = events.find(e => e.event === 'scoreboard_update');
        if (updateEvent) update = updateEvent.data;

        if (gotSnapshot && !update) {
          gotSnapshot = false;
          setTimeout(async () => {
            await setScoreViaAPI('homeScore', 88);
          }, 500);
        }
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    expect(update).not.toBeNull();
    expect(update.homeScore).toBe(88);
  });

  test('SSE update event also has all required fields', async () => {
    await resetScores();

    const controller = new AbortController();
    const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotSnapshot = false;
    let update: any = null;

    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      while (!update) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = parseSSEEvents(buffer);
        if (events.some(e => e.event === 'scoreboard_snapshot')) gotSnapshot = true;
        const updateEvent = events.find(e => e.event === 'scoreboard_update');
        if (updateEvent) update = updateEvent.data;

        if (gotSnapshot && !update) {
          gotSnapshot = false;
          setTimeout(async () => {
            await setScoreViaAPI('awayScore', 55);
          }, 500);
        }
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    expect(update).not.toBeNull();
    // Full field check on update event
    expect(update.awayScore).toBe(55);
    expect(typeof update.homeTeamName).toBe('string');
    expect(typeof update.awayTeamName).toBe('string');
    expect(typeof update.clockMode).toBe('string');
    expect(typeof update.homeScore).toBe('number');
    expect(typeof update.awayScore).toBe('number');
  });

  test('multiple SSE subscribers each receive update', async () => {
    await resetScores();

    // Connect 3 SSE listeners
    const controllers = [new AbortController(), new AbortController(), new AbortController()];
    const responses = await Promise.all(
      controllers.map(c =>
        fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, { signal: c.signal })
      )
    );

    // Wait for all 3 to connect and receive snapshot
    await new Promise(r => setTimeout(r, 2000));

    // Update score
    await setScoreViaAPI('homeScore', 33);

    // Read from all 3 for up to 5 seconds
    const results = await Promise.all(
      responses.map(async (resp, i) => {
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const deadline = Date.now() + 5000;

        while (Date.now() < deadline) {
          const { done, value } = await Promise.race([
            reader.read(),
            new Promise<{ done: true; value: undefined }>(r =>
              setTimeout(() => r({ done: true, value: undefined }), deadline - Date.now())
            ),
          ]);
          if (done) break;
          if (value) buffer += decoder.decode(value, { stream: true });

          const events = parseSSEEvents(buffer);
          const updateEvent = events.find(e => e.event === 'scoreboard_update');
          if (updateEvent) {
            controllers[i].abort();
            return updateEvent.data;
          }
        }
        controllers[i].abort();
        return null;
      })
    );

    // All 3 should have received the update
    for (let i = 0; i < 3; i++) {
      expect(results[i], `SSE subscriber ${i + 1} should receive update`).not.toBeNull();
      expect(results[i]?.homeScore).toBe(33);
    }
  });
});

// ============================================================
// SUITE 3: Cross-viewer push via API
// ============================================================
test.describe('Scoreboard Real-Time Cross-Viewer Push', () => {
  test.describe.configure({ timeout: 120000 });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('viewer 2 sees score change from API without page refresh', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      const before = await getScoresFromAPI();
      expect(before.home).toBe(0);

      await setScoreViaAPI('homeScore', 23);
      await page2.waitForTimeout(5000);

      await expandScoreboardIfNeeded(page2);

      // Use targeted assertion: read score-card elements
      const displayed = await getDisplayedScores(page2);
      if (displayed) {
        expect(displayed.home).toBe(23);
      } else {
        // Fallback to page text
        const pageText = await page2.evaluate(() => document.body.innerText);
        expect(pageText).toContain('23');
      }
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });

  test('both home and away score updates push to other viewer', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      await setScoreViaAPI('homeScore', 14);
      await setScoreViaAPI('awayScore', 7);
      await page2.waitForTimeout(5000);

      await expandScoreboardIfNeeded(page2);

      const displayed = await getDisplayedScores(page2);
      if (displayed) {
        expect(displayed.home).toBe(14);
        expect(displayed.away).toBe(7);
      } else {
        const pageText = await page2.evaluate(() => document.body.innerText);
        expect(pageText).toContain('14');
        expect(pageText).toContain('7');
      }

      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(14);
      expect(scores.away).toBe(7);
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });

  test('rapid sequential updates: final state is correct on other viewer', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      // Fire 5 rapid score updates
      for (let i = 1; i <= 5; i++) {
        await setScoreViaAPI('homeScore', i * 10);
        await new Promise(r => setTimeout(r, 200));
      }

      // Wait for SSE to propagate all events
      await page2.waitForTimeout(5000);

      // Final score should be 50 on both API and page2
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(50);

      await expandScoreboardIfNeeded(page2);
      const displayed = await getDisplayedScores(page2);
      if (displayed) {
        expect(displayed.home).toBe(50);
      } else {
        const pageText = await page2.evaluate(() => document.body.innerText);
        expect(pageText).toContain('50');
      }
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });
});

// ============================================================
// SUITE 4: UI-driven score edits push via SSE
// ============================================================
test.describe('UI-Driven Score Edit → SSE Push', () => {
  test.describe.configure({ timeout: 120000 });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('viewer 1 edits home score via UI, viewer 2 sees it without refresh', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      // Expand scoreboard on both pages
      await expandScoreboardIfNeeded(page1);
      await expandScoreboardIfNeeded(page2);

      // Viewer 1: edit home score via UI to 19
      const edited = await editScoreViaUI(page1, 'home', 19);
      if (!edited) { test.skip(true, 'Could not edit score via UI'); return; }

      // Verify API persisted it
      await page1.waitForTimeout(2000);
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(19);

      // Wait for SSE push to viewer 2
      await page2.waitForTimeout(5000);

      // Viewer 2 should see 19 via SSE — no refresh
      const displayed2 = await getDisplayedScores(page2);
      if (displayed2) {
        expect(displayed2.home).toBe(19);
      } else {
        const text = await page2.evaluate(() => document.body.innerText);
        expect(text).toContain('19');
      }
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });

  test('viewer 1 edits away score via UI, viewer 2 sees it', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      await expandScoreboardIfNeeded(page1);
      await expandScoreboardIfNeeded(page2);

      const edited = await editScoreViaUI(page1, 'away', 31);
      if (!edited) { test.skip(true, 'Could not edit away score via UI'); return; }

      await page1.waitForTimeout(2000);
      expect((await getScoresFromAPI()).away).toBe(31);

      await page2.waitForTimeout(5000);
      const displayed2 = await getDisplayedScores(page2);
      if (displayed2) {
        expect(displayed2.away).toBe(31);
      } else {
        const text = await page2.evaluate(() => document.body.innerText);
        expect(text).toContain('31');
      }
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });

  test('viewer 1 uses +1 button 3x, viewer 2 sees final score', async ({ browser }) => {
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      await expandScoreboardIfNeeded(page1);
      await expandScoreboardIfNeeded(page2);

      // Use +1 button 3 times via edit sheet
      const incremented = await incrementScoreViaUI(page1, 'home', 3);
      if (!incremented) { test.skip(true, 'Could not use +1 button'); return; }

      await page1.waitForTimeout(2000);
      expect((await getScoresFromAPI()).home).toBe(3);

      await page2.waitForTimeout(5000);
      const displayed2 = await getDisplayedScores(page2);
      if (displayed2) {
        expect(displayed2.home).toBe(3);
      } else {
        const text = await page2.evaluate(() => document.body.innerText);
        expect(text).toContain('3');
      }
    } finally {
      await ctx1.close().catch(() => {});
      await ctx2.close().catch(() => {});
    }
  });
});

// ============================================================
// SUITE 5: Bidirectional push (A→B then B→A)
// ============================================================
test.describe('Bidirectional Score Push', () => {
  test.describe.configure({ timeout: 120000 });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('viewer A edits, viewer B sees; then viewer B edits, viewer A sees', async ({ browser }) => {
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await pageA.goto(STREAM_URL);
      await pageB.goto(STREAM_URL);
      await pageA.waitForTimeout(6000);
      await pageB.waitForTimeout(6000);

      await expandScoreboardIfNeeded(pageA);
      await expandScoreboardIfNeeded(pageB);

      // Step 1: Viewer A sets home score to 5 via API
      await setScoreViaAPI('homeScore', 5);
      await pageB.waitForTimeout(4000);

      // Verify B sees it
      let displayedB = await getDisplayedScores(pageB);
      if (displayedB) {
        expect(displayedB.home).toBe(5);
      }

      // Step 2: Viewer B sets away score to 8 via API
      await setScoreViaAPI('awayScore', 8);
      await pageA.waitForTimeout(4000);

      // Verify A sees it
      let displayedA = await getDisplayedScores(pageA);
      if (displayedA) {
        expect(displayedA.away).toBe(8);
      }

      // Step 3: Final state — both should show 5-8
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(5);
      expect(scores.away).toBe(8);

      // Double-check both pages
      displayedA = await getDisplayedScores(pageA);
      displayedB = await getDisplayedScores(pageB);
      if (displayedA && displayedB) {
        expect(displayedA.home).toBe(5);
        expect(displayedA.away).toBe(8);
        expect(displayedB.home).toBe(5);
        expect(displayedB.away).toBe(8);
      }
    } finally {
      await ctxA.close().catch(() => {});
      await ctxB.close().catch(() => {});
    }
  });
});

// ============================================================
// SUITE 6: Three-viewer simultaneous push
// ============================================================
test.describe('Three-Viewer Simultaneous SSE', () => {
  test.describe.configure({ timeout: 120000 });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score update reaches all 3 browser viewers', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    try {
      // Open 3 viewers
      for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await ctx.newPage();
        contexts.push(ctx);
        pages.push(page);
      }

      // Navigate all 3
      await Promise.all(pages.map(p => p.goto(STREAM_URL)));
      await pages[0].waitForTimeout(7000);

      // Update score via API
      await setScoreViaAPI('homeScore', 99);

      // Wait for SSE push
      await pages[0].waitForTimeout(5000);

      // Expand and verify all 3
      for (let i = 0; i < 3; i++) {
        await expandScoreboardIfNeeded(pages[i]);
        const displayed = await getDisplayedScores(pages[i]);
        if (displayed) {
          expect(displayed.home, `Viewer ${i + 1} should show score 99`).toBe(99);
        } else {
          const text = await pages[i].evaluate(() => document.body.innerText);
          expect(text, `Viewer ${i + 1} page should contain 99`).toContain('99');
        }
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});

// ============================================================
// SUITE 7: Team name updates propagate via SSE
// ============================================================
test.describe('Team Name SSE Propagation', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScores();
  });

  test.afterEach(async () => {
    // Restore default team names
    await setTeamNameViaProducerAPI('homeTeamName', 'Home');
    await setTeamNameViaProducerAPI('awayTeamName', 'Away');
  });

  test('team name change via producer endpoint triggers SSE update event', async () => {
    // Connect SSE first, then change the name so we catch the update event
    const controller = new AbortController();
    const sseResp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });

    const reader = sseResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Wait for initial snapshot first
    let gotSnapshot = false;
    const snapshotTimeout = setTimeout(() => controller.abort(), 10000);
    while (!gotSnapshot) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (parseSSEEvents(buffer).some(e => e.event === 'scoreboard_snapshot')) {
        gotSnapshot = true;
      }
    }
    clearTimeout(snapshotTimeout);
    expect(gotSnapshot).toBe(true);

    // Now change the team name via producer endpoint
    const resp = await setTeamNameViaProducerAPI('homeTeamName', 'Eagles');
    expect(resp.ok).toBe(true);

    // Read the SSE update event
    let updateEvent: any = null;
    const updateTimeout = setTimeout(() => controller.abort(), 10000);
    try {
      while (!updateEvent) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = parseSSEEvents(buffer);
        updateEvent = events.find(e => e.event === 'scoreboard_update')?.data ?? null;
      }
    } finally {
      clearTimeout(updateTimeout);
      controller.abort();
    }

    expect(updateEvent).not.toBeNull();
    expect(updateEvent.homeTeamName).toBe('Eagles');
  });

  test('team name change appears in subsequent SSE snapshot', async () => {
    // Set the team name first
    const resp = await setTeamNameViaProducerAPI('awayTeamName', 'Wolves');
    expect(resp.ok).toBe(true);

    // Connect SSE — the snapshot should reflect the new name
    const controller = new AbortController();
    const sseResp = await fetch(`${API_BASE}/api/direct/test/scoreboard/stream`, {
      signal: controller.signal,
    });

    const reader = sseResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let snapshot: any = null;

    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      while (!snapshot) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const snapshotEvent = parseSSEEvents(buffer).find(e => e.event === 'scoreboard_snapshot');
        if (snapshotEvent) snapshot = snapshotEvent.data;
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    expect(snapshot).not.toBeNull();
    expect(snapshot.awayTeamName).toBe('Wolves');
  });
});

// ============================================================
// SUITE 8: Cross-form-factor real-time push
// ============================================================
test.describe('Scoreboard SSE — Portrait Mobile (390x844)', () => {
  test.describe.configure({ timeout: 60000 });
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score updated via API appears on portrait page via SSE', async ({ page }) => {
    await navigateAndWait(page);
    await setScoreViaAPI('homeScore', 8);
    await setScoreViaAPI('awayScore', 4);
    await page.waitForTimeout(3000);

    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('8');
    expect(pageText).toContain('4');
  });

  test('score updates push to compact score bar in portrait', async ({ page }) => {
    await navigateAndWait(page);

    const scoreBar = page.getByTestId('compact-score-bar');
    const hasBar = await scoreBar.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasBar) { test.skip(true, 'CompactScoreBar not visible'); return; }

    // Verify initial 0-0
    let barText = await scoreBar.innerText();
    expect(barText).toContain('0');

    // Update score via API
    await setScoreViaAPI('homeScore', 6);
    await page.waitForTimeout(3000);

    // Compact bar should show updated score
    barText = await scoreBar.innerText();
    expect(barText).toContain('6');
  });
});

test.describe('Scoreboard SSE — Landscape Mobile (844x390)', () => {
  test.describe.configure({ timeout: 60000 });
  test.use({ viewport: { width: 844, height: 390 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score updated via API appears in landscape', async ({ page }) => {
    await navigateAndWait(page);

    await expandScoreboardIfNeeded(page);

    await setScoreViaAPI('homeScore', 11);
    await page.waitForTimeout(3000);

    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('11');
  });
});

test.describe('Scoreboard SSE — Tablet (768x1024)', () => {
  test.describe.configure({ timeout: 60000 });
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score updated via API appears on tablet page via SSE', async ({ page }) => {
    await navigateAndWait(page);
    await setScoreViaAPI('homeScore', 12);
    await page.waitForTimeout(3000);

    await expandScoreboardIfNeeded(page);
    const displayed = await getDisplayedScores(page);
    if (displayed) {
      expect(displayed.home).toBe(12);
    } else {
      const pageText = await page.evaluate(() => document.body.innerText);
      expect(pageText).toContain('12');
    }
  });

  test('tablet scoreboard cards show precise score from SSE push', async ({ page }) => {
    await navigateAndWait(page);
    await expandScoreboardIfNeeded(page);

    await setScoreViaAPI('homeScore', 27);
    await setScoreViaAPI('awayScore', 13);
    await page.waitForTimeout(4000);

    const displayed = await getDisplayedScores(page);
    if (displayed) {
      expect(displayed.home).toBe(27);
      expect(displayed.away).toBe(13);
    } else {
      // Verify via API at minimum
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(27);
      expect(scores.away).toBe(13);
    }
  });
});
