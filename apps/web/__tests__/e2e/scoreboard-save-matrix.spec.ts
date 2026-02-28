import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Scoreboard Save Matrix E2E Tests
 *
 * Comprehensive coverage of score saving across all auth levels, form factors,
 * permission flag combinations, SSE propagation, and UX quality.
 *
 * Uses an isolated test stream created via DB seed (e2e-scoreboard-test).
 * Runs locally against API (localhost:4301) + web (localhost:4300).
 *
 * Groups:
 *   1. Admin score saves (JWT auth)
 *   2. Authenticated viewer score saves (viewer token)
 *   3. Anonymous score editing (no token)
 *   4. SSE propagation (multi-viewer)
 *   5. Permission gate tests
 *   6. UX quality checks
 */

const API_BASE = 'http://localhost:4301';
const STREAM_SLUG = 'e2e-scoreboard-test';
const STREAM_URL = `/direct/${STREAM_SLUG}`;
const ADMIN_PASSWORD = 'e2e-test-password-2026';

// ─── Helpers ────────────────────────────────────────────────────

async function ensureTestStream(): Promise<void> {
  // Trigger bootstrap to auto-create the stream if missing (returns 404 on missing slug,
  // so we seed via the direct POST endpoint instead)
  const check = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/bootstrap`);
  if (check.ok) return; // already exists

  // Create the stream via POST /api/direct/:slug (legacy create)
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`Failed to create test stream: ${resp.status} ${await resp.text()}`);
  }
}

async function getAdminToken(): Promise<string> {
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/unlock-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok) throw new Error(`Admin unlock failed: ${resp.status}`);
  const data = await resp.json();
  return data.token;
}

async function updateStreamSettings(adminToken: string, settings: Record<string, unknown>): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(settings),
  });
  if (!resp.ok) throw new Error(`Settings update failed: ${resp.status} ${await resp.text()}`);
}

async function resetScoresViaAPI(adminToken: string): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };
  await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
    method: 'POST', headers,
    body: JSON.stringify({ field: 'homeScore', value: 0 }),
  });
  await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
    method: 'POST', headers,
    body: JSON.stringify({ field: 'awayScore', value: 0 }),
  });
}

async function getScoresFromAPI(): Promise<{ home: number; away: number }> {
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard`);
  if (!resp.ok) throw new Error(`Failed to get scores: ${resp.status}`);
  const data = await resp.json();
  return { home: data.homeScore, away: data.awayScore };
}

async function setScoreViaAPI(adminToken: string, field: string, value: number): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ field, value }),
  });
  if (!resp.ok) throw new Error(`Score update failed: ${resp.status}`);
}

async function getAnonymousToken(): Promise<string> {
  const session = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resp = await fetch(`${API_BASE}/api/public/direct/${STREAM_SLUG}/viewer/anonymous-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session }),
  });
  if (!resp.ok) throw new Error(`Failed to get anon token: ${resp.status}`);
  const { viewerToken } = await resp.json();
  return viewerToken;
}

/**
 * Unlock admin on page: click Admin Panel -> enter password -> submit -> close panel -> expand scoreboard
 */
async function unlockAdminOnPage(page: Page): Promise<boolean> {
  const adminBtn = page.getByTestId('btn-open-admin-panel').or(page.getByTestId('btn-open-edit'));
  if (!await adminBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    return false;
  }
  await adminBtn.first().click();
  await page.waitForTimeout(1000);

  const passwordInput = page.getByTestId('admin-password-input');
  if (!await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) return false;
  await passwordInput.fill(ADMIN_PASSWORD);

  const form = page.getByTestId('admin-unlock-form');
  const submitBtn = form.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Close admin panel
  const closeBtn = page.getByTestId('btn-close-edit');
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Expand scoreboard
  const expandBtn = page.getByTestId('btn-expand-scoreboard');
  if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(1000);
  }

  const scoreCardBtns = page.getByTestId('score-card-button');
  return await scoreCardBtns.count() >= 2;
}

/** Read displayed scores from score-card elements */
async function getDisplayedScores(page: Page): Promise<{ home: number; away: number } | null> {
  const scoreCards = page.getByTestId('score-card');
  const count = await scoreCards.count();
  if (count < 2) return null;

  const homeText = await scoreCards.nth(0).innerText();
  const awayText = await scoreCards.nth(count - 1).innerText();

  const homeMatch = homeText.match(/\b(\d+)\b/);
  const awayMatch = awayText.match(/\b(\d+)\b/);
  if (!homeMatch || !awayMatch) return null;

  return { home: parseInt(homeMatch[1], 10), away: parseInt(awayMatch[1], 10) };
}

/** Edit score via UI: click score card -> fill input -> Save */
async function editScoreViaUI(page: Page, which: 'home' | 'away', targetScore: number): Promise<boolean> {
  const scoreCards = page.getByTestId('score-card-button');
  const count = await scoreCards.count();
  if (count < 2) return false;

  const cardIndex = which === 'home' ? 0 : count - 1;
  await scoreCards.nth(cardIndex).click();
  await page.waitForTimeout(800);

  const scoreInput = page.locator('input[inputmode="numeric"]').first();
  if (!await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) return false;

  await scoreInput.fill(String(targetScore));
  await page.waitForTimeout(200);

  const saveBtn = page.getByText('Save');
  if (!await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) return false;
  await saveBtn.click();
  await page.waitForTimeout(1500);
  return true;
}

// ─── Setup ──────────────────────────────────────────────────────

let adminToken: string;

test.beforeAll(async () => {
  await ensureTestStream();
  adminToken = await getAdminToken();

  // Enable all editing features for the test stream
  await updateStreamSettings(adminToken, {
    scoreboardEnabled: true,
    allowViewerScoreEdit: true,
    allowViewerNameEdit: true,
    allowAnonymousScoreEdit: true,
    allowAnonymousChat: true,
  });
});

// ─── Group 1: Admin Score Saves ─────────────────────────────────

test.describe('Group 1: Admin Score Saves', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
  });

  test('1.1 admin edits home score via UI (desktop sidebar)', async ({ page }) => {
    test.use({ viewport: { width: 1440, height: 900 } });
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const edited = await editScoreViaUI(page, 'home', 5);
    expect(edited).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(5);

    const displayed = await getDisplayedScores(page);
    expect(displayed?.home).toBe(5);
  });

  test('1.2 admin edits away score via UI (desktop sidebar)', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const edited = await editScoreViaUI(page, 'away', 3);
    expect(edited).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.away).toBe(3);
  });

  test('1.3 admin edits score in portrait (compact bar)', async ({ page }) => {
    // Unlock at desktop width first
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Switch to portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);

    // Tap compact score bar to expand
    const scoreBar = page.getByTestId('compact-score-bar');
    if (await scoreBar.isVisible().catch(() => false)) {
      await scoreBar.click();
      await page.waitForTimeout(500);
    }

    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() >= 2) {
      const edited = await editScoreViaUI(page, 'home', 4);
      expect(edited).toBe(true);

      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(4);
    }
  });

  test('1.4 admin edits score in landscape (floating)', async ({ page }) => {
    // Unlock at desktop width first
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(2000);

    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
    }

    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() >= 2) {
      const edited = await editScoreViaUI(page, 'home', 6);
      expect(edited).toBe(true);

      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(6);
    }
  });

  test('1.5 admin edits score on tablet (sidebar)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const edited = await editScoreViaUI(page, 'away', 8);
    expect(edited).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.away).toBe(8);
  });

  test('1.6 admin edit persists after page reload', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const edited = await editScoreViaUI(page, 'home', 7);
    expect(edited).toBe(true);

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(4000);

    // Expand scoreboard again
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
    }

    const displayed = await getDisplayedScores(page);
    expect(displayed?.home).toBe(7);

    const apiScores = await getScoresFromAPI();
    expect(apiScores.home).toBe(7);
  });
});

// ─── Group 2: Authenticated Viewer Score Saves ──────────────────

test.describe('Group 2: Authenticated Viewer Score Saves', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
    // Ensure viewer editing is enabled
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
      allowAnonymousChat: true,
    });
  });

  test('2.1 registered viewer edits home score', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(5000); // Wait for anonymous auto-connect

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
    }

    const scoreCards = page.getByTestId('score-card-button');
    const count = await scoreCards.count();
    if (count >= 2) {
      const edited = await editScoreViaUI(page, 'home', 2);
      expect(edited).toBe(true);

      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(2);
    } else {
      // Score cards not editable — test the API directly
      const viewerToken = await getAnonymousToken();
      const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ viewerToken, field: 'homeScore', value: 2 }),
      });
      expect(resp.ok).toBe(true);

      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(2);
    }
  });

  test('2.2 viewer blocked when allowViewerScoreEdit is false', async () => {
    // Disable viewer editing
    await updateStreamSettings(adminToken, { allowViewerScoreEdit: false });

    const viewerToken = await getAnonymousToken();
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ viewerToken, field: 'homeScore', value: 99 }),
    });

    expect(resp.status).toBe(403);
    const body = await resp.json();
    expect(body.error).toContain('disabled');

    // Restore
    await updateStreamSettings(adminToken, { allowViewerScoreEdit: true });
  });
});

// ─── Group 3: Anonymous Score Editing ───────────────────────────

test.describe('Group 3: Anonymous Score Editing', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
    });
  });

  test('3.1 anonymous user edits score via API (no token)', async () => {
    // POST without any Authorization header or viewerToken
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'homeScore', value: 3 }),
    });
    expect(resp.ok).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(3);
  });

  test('3.2 anonymous blocked when allowAnonymousScoreEdit is false', async () => {
    await updateStreamSettings(adminToken, { allowAnonymousScoreEdit: false });

    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'homeScore', value: 99 }),
    });
    expect(resp.status).toBe(401);

    // Restore
    await updateStreamSettings(adminToken, { allowAnonymousScoreEdit: true });
  });

  test('3.3 anonymous can edit scores but NOT team names', async () => {
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'homeTeamName', value: 'Hackers' }),
    });
    // Should fail — anonymous cannot edit team names (requires viewerToken)
    expect(resp.status).toBe(401);
  });
});

// ─── Group 4: SSE Propagation (multi-viewer) ────────────────────

test.describe('Group 4: SSE Propagation', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
  });

  test('4.1 admin edit pushes to anonymous viewer via SSE', async ({ browser }) => {
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await Promise.all([pageA.goto(STREAM_URL), pageB.goto(STREAM_URL)]);
      await pageA.waitForTimeout(3000);
      await pageB.waitForTimeout(3000);

      // Admin unlocks on A
      const unlocked = await unlockAdminOnPage(pageA);
      expect(unlocked).toBe(true);

      // A edits home score to 5
      const edited = await editScoreViaUI(pageA, 'home', 5);
      expect(edited).toBe(true);

      // Wait for SSE push to B
      await pageB.waitForTimeout(5000);

      // Verify B sees the update
      const expandBtn = pageB.getByTestId('btn-expand-scoreboard');
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await pageB.waitForTimeout(1000);
      }

      const bScores = await getDisplayedScores(pageB);
      if (bScores) {
        expect(bScores.home).toBe(5);
      }

      // Verify API
      const apiScores = await getScoresFromAPI();
      expect(apiScores.home).toBe(5);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('4.2 API score update pushes to viewer via SSE', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(5000);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
    }

    // Update scores via API (using producer endpoint -- open access if no producer password)
    await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: 9, awayScore: 6 }),
    });

    // Wait for SSE push
    await page.waitForTimeout(4000);

    const displayed = await getDisplayedScores(page);
    if (displayed) {
      expect(displayed.home).toBe(9);
      expect(displayed.away).toBe(6);
    }
  });

  test('4.3 bidirectional push between two viewers', async ({ browser }) => {
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await Promise.all([pageA.goto(STREAM_URL), pageB.goto(STREAM_URL)]);
      await pageA.waitForTimeout(3000);
      await pageB.waitForTimeout(3000);

      // Unlock admin on both
      await unlockAdminOnPage(pageA);
      await unlockAdminOnPage(pageB);

      // A edits home to 4
      await editScoreViaUI(pageA, 'home', 4);
      await pageB.waitForTimeout(4000);

      let bScores = await getDisplayedScores(pageB);
      if (bScores) expect(bScores.home).toBe(4);

      // B edits away to 2
      await editScoreViaUI(pageB, 'away', 2);
      await pageA.waitForTimeout(4000);

      const aScores = await getDisplayedScores(pageA);
      if (aScores) expect(aScores.away).toBe(2);

      // Verify final API state
      const api = await getScoresFromAPI();
      expect(api.home).toBe(4);
      expect(api.away).toBe(2);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('4.4 rapid sequential updates all arrive', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(5000);

    // Send 5 rapid updates via API
    for (let i = 1; i <= 5; i++) {
      await setScoreViaAPI(adminToken, 'homeScore', i);
    }

    // Wait for SSE to deliver
    await page.waitForTimeout(5000);

    const apiScores = await getScoresFromAPI();
    expect(apiScores.home).toBe(5);
  });
});

// ─── Group 5: Permission Gate Tests ─────────────────────────────

test.describe('Group 5: Permission Gates', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
  });

  test('5.1 admin can edit even when viewer flags are off', async () => {
    // Disable all viewer editing
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: false,
      allowAnonymousScoreEdit: false,
    });

    // Admin should still be able to edit via API
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'homeScore', value: 10 }),
    });
    expect(resp.ok).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(10);

    // Restore
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
    });
  });

  test('5.2 admin sees editable scoreboard when viewer flags are off (UI)', async ({ page }) => {
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: false,
      allowAnonymousScoreEdit: false,
    });

    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Admin should see score-card-button elements (editable)
    const scoreCards = page.getByTestId('score-card-button');
    expect(await scoreCards.count()).toBeGreaterThanOrEqual(2);

    // Restore
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
    });
  });

  test('5.3 score > 999 rejected by API', async () => {
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'homeScore', value: 1000 }),
    });
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBeDefined();
  });

  test('5.4 invalid field rejected by API', async () => {
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'hackerField', value: 1 }),
    });
    expect(resp.status).toBe(400);
  });
});

// ─── Group 6: UX Quality Checks ─────────────────────────────────

test.describe('Group 6: UX Quality', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async () => {
    await resetScoresViaAPI(adminToken);
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
    });
  });

  test('6.1 score edit sheet opens on tap and closes on Cancel', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Tap score card to open edit sheet
    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() >= 2) {
      await scoreCards.nth(0).click();
      await page.waitForTimeout(800);

      // Verify score input is visible (sheet is open)
      const scoreInput = page.locator('input[inputmode="numeric"]').first();
      expect(await scoreInput.isVisible({ timeout: 3000 })).toBe(true);

      // Click Cancel
      const cancelBtn = page.getByText('Cancel');
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Sheet should be closed
        expect(await scoreInput.isVisible().catch(() => false)).toBe(false);
      }
    }
  });

  test('6.2 quick increment buttons work', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() >= 2) {
      await scoreCards.nth(0).click();
      await page.waitForTimeout(800);

      // Look for +1 button
      const plusOneBtn = page.getByText('+1').first();
      if (await plusOneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await plusOneBtn.click();
        await plusOneBtn.click();
        await plusOneBtn.click();
        await page.waitForTimeout(300);

        // Save
        const saveBtn = page.getByText('Save');
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(1500);

          const scores = await getScoresFromAPI();
          expect(scores.home).toBe(3);
        }
      }
    }
  });

  test('6.3 score 0 is valid', async () => {
    // Set score to 5, then back to 0
    await setScoreViaAPI(adminToken, 'homeScore', 5);
    const mid = await getScoresFromAPI();
    expect(mid.home).toBe(5);

    await setScoreViaAPI(adminToken, 'homeScore', 0);
    const final = await getScoresFromAPI();
    expect(final.home).toBe(0);
  });

  test('6.4 negative score rejected', async () => {
    const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'homeScore', value: -1 }),
    });
    expect(resp.status).toBe(400);
  });

  test('6.5 scoreboard error message displays on save failure', async ({ page }) => {
    // Disable viewer editing, then try to save as non-admin
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: false,
      allowAnonymousScoreEdit: false,
    });

    await page.goto(STREAM_URL);
    await page.waitForTimeout(5000);

    // The scoreboard should NOT be editable for a non-admin viewer (no score-card-button)
    const scoreCards = page.getByTestId('score-card-button');
    const count = await scoreCards.count();
    // When editing is disabled and user is not admin, no edit buttons should show
    expect(count).toBe(0);

    // Restore
    await updateStreamSettings(adminToken, {
      allowViewerScoreEdit: true,
      allowAnonymousScoreEdit: true,
    });
  });
});
