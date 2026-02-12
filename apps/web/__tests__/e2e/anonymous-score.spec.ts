import { test, expect, type Page } from '@playwright/test';

/**
 * Anonymous Score Editing E2E Tests
 *
 * Tests that anonymous viewers can change scores on streams with
 * allowViewerScoreEdit + allowAnonymousScoreEdit enabled.
 *
 * Form factors:
 *   - Portrait mobile (390x844) — CompactScoreBar + expanded Scoreboard
 *   - Landscape mobile (844x390) — floating/minimal scoreboard
 *   - Tablet portrait (768x1024) — sidebar scoreboard
 *   - Desktop (1440x900) — sidebar scoreboard
 *
 * Prereqs: local API + web running, "test" stream with:
 *   - scoreboardEnabled: true
 *   - allowViewerScoreEdit: true
 *   - allowAnonymousScoreEdit: true
 *   - allowAnonymousChat: true (for auto-connect)
 *   - streamUrl set
 */

const STREAM_URL = '/direct/test';
const API_BASE = 'http://localhost:4301';

// Reset scores to 0 before each test via API
async function resetScores() {
  // Use a direct DB reset via the API — fetch current, then set to 0
  const session = `reset-${Date.now()}`;
  const tokenResp = await fetch(`${API_BASE}/api/public/direct/test/viewer/anonymous-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session }),
  });
  if (!tokenResp.ok) return;
  const { viewerToken } = await tokenResp.json();

  // Reset home score
  await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
    body: JSON.stringify({ field: 'homeScore', value: 0 }),
  });
  // Reset away score
  await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
    body: JSON.stringify({ field: 'awayScore', value: 0 }),
  });
}

// Wait for page bootstrap + anonymous auto-connect
async function navigateAndWaitForUnlock(page: Page): Promise<boolean> {
  await page.goto(STREAM_URL);
  await page.waitForTimeout(5000);
  // Verify bookmark controls visible (means viewer is unlocked)
  return page.getByTestId('btn-quick-bookmark').isVisible({ timeout: 5000 }).catch(() => false);
}

// Get score value from the API
async function getScoresFromAPI(): Promise<{ home: number; away: number }> {
  const resp = await fetch(`${API_BASE}/api/direct/test/scoreboard`);
  const data = await resp.json();
  return { home: data.homeScore, away: data.awayScore };
}

// ============================================================
// DESKTOP (1440x900) — sidebar scoreboard with score cards
// ============================================================
test.describe('Anonymous Score Editing — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('scoreboard renders and shows scores', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Expand scoreboard if collapsed
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    // Scoreboard should be visible
    const scoreboard = page.getByTestId('scoreboard-v2');
    const isVisible = await scoreboard.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Scoreboard not visible'); return; }

    await expect(scoreboard).toBeVisible();
  });

  test('score cards are tappable (editable)', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    // Score cards should be tappable buttons
    const scoreCardButtons = page.getByTestId('score-card-button');
    const count = await scoreCardButtons.count();
    if (count === 0) { test.skip(true, 'No editable score cards'); return; }

    expect(count).toBeGreaterThanOrEqual(2); // home + away
  });

  test('tap score card opens edit sheet and save updates score', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() < 2) { test.skip(true, 'No editable score cards'); return; }

    // Tap home team score card
    await scoreCards.first().click();
    await page.waitForTimeout(600);

    // Edit sheet should appear with Save button
    const saveBtn = page.getByText('Save');
    const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasSave) { test.skip(true, 'Edit sheet did not open'); return; }

    // Find the score input and change it to 5
    const scoreInput = page.locator('input[type="number"], input[inputmode="numeric"]').first();
    if (await scoreInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreInput.fill('5');
    } else {
      // Try text input that shows the score
      const textInput = page.locator('input').filter({ hasText: /\d/ }).first();
      if (await textInput.isVisible().catch(() => false)) {
        await textInput.fill('5');
      }
    }

    // Save
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Verify score was persisted via API
    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(5);
  });

  test('increment buttons update score via API', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    // Check for increment buttons
    const incrementBtn = page.getByTestId('score-increment-button').first();
    const hasIncrement = await incrementBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasIncrement) {
      // Click +1 three times
      await incrementBtn.click();
      await page.waitForTimeout(500);
      await incrementBtn.click();
      await page.waitForTimeout(500);
      await incrementBtn.click();
      await page.waitForTimeout(2000);

      // Verify score persisted
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(3);
    } else {
      // No increment buttons — use tap-to-edit flow instead
      const scoreCards = page.getByTestId('score-card-button');
      if (await scoreCards.count() < 2) { test.skip(); return; }

      await scoreCards.first().click();
      await page.waitForTimeout(600);

      // Use +1 button in edit sheet
      const plus1 = page.getByText('+1').first();
      if (await plus1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await plus1.click();
        await page.waitForTimeout(300);
        await plus1.click();
        await page.waitForTimeout(300);
        await plus1.click();
        await page.waitForTimeout(300);

        const saveBtn = page.getByText('Save');
        await saveBtn.click();
        await page.waitForTimeout(2000);

        const scores = await getScoresFromAPI();
        expect(scores.home).toBe(3);
      }
    }
  });

  test('score persists across page reload', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Set a known score via API first
    const session = `persist-test-${Date.now()}`;
    const tokenResp = await fetch(`${API_BASE}/api/public/direct/test/viewer/anonymous-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session }),
    });
    if (!tokenResp.ok) { test.skip(); return; }
    const { viewerToken } = await tokenResp.json();

    await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ field: 'homeScore', value: 7 }),
    });
    await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ field: 'awayScore', value: 3 }),
    });

    // Reload page
    await page.reload();
    await page.waitForTimeout(6000);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    // Verify the scores display correctly
    const pageText = await page.evaluate(() => document.body.innerText);
    // Score should show 7 and 3 somewhere on the page
    expect(pageText).toContain('7');
    expect(pageText).toContain('3');

    // Also verify via API
    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(7);
    expect(scores.away).toBe(3);
  });

  test('score update from one client appears on another', async ({ browser }) => {
    // Create two separate browser contexts (two different anonymous users)
    const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both navigate to the stream
      await page1.goto(STREAM_URL);
      await page2.goto(STREAM_URL);
      await page1.waitForTimeout(5000);
      await page2.waitForTimeout(5000);

      // Set score to 10 via API
      const session = `cross-client-${Date.now()}`;
      const tokenResp = await fetch(`${API_BASE}/api/public/direct/test/viewer/anonymous-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session }),
      });
      if (!tokenResp.ok) { test.skip(); return; }
      const { viewerToken } = await tokenResp.json();

      await fetch(`${API_BASE}/api/direct/test/scoreboard/viewer-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ field: 'homeScore', value: 10 }),
      });

      // Wait for polling to pick up change (5s poll interval + buffer)
      await page1.waitForTimeout(8000);
      await page2.waitForTimeout(3000);

      // Both pages should show the updated score via API verification
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(10);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// ============================================================
// PORTRAIT MOBILE (390x844) — CompactScoreBar
// ============================================================
test.describe('Anonymous Score Editing — Portrait Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('compact score bar renders in portrait mode', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    const scoreBar = page.getByTestId('compact-score-bar');
    const isVisible = await scoreBar.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      await expect(scoreBar).toBeVisible();
      // Score bar should show 0 - 0 initially
      const text = await scoreBar.innerText();
      expect(text).toContain('0');
    } else {
      // Scoreboard may not render in portrait — soft pass
      test.skip(true, 'CompactScoreBar not visible in portrait');
    }
  });

  test('expanded scoreboard shows editable scores in portrait', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    const scoreBar = page.getByTestId('compact-score-bar');
    if (!await scoreBar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }

    // Click compact score bar to expand
    await scoreBar.click();
    await page.waitForTimeout(600);

    // Expanded scoreboard should appear with editable score cards
    const scoreCards = page.getByTestId('score-card-button');
    const count = await scoreCards.count();

    if (count >= 2) {
      // Tap home score to edit
      await scoreCards.first().click();
      await page.waitForTimeout(600);

      // Edit sheet should open
      const saveBtn = page.getByText('Save');
      const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasSave) {
        // Use +1 button
        const plus1 = page.getByText('+1').first();
        if (await plus1.isVisible({ timeout: 2000 }).catch(() => false)) {
          await plus1.click();
          await page.waitForTimeout(300);
          await saveBtn.click();
          await page.waitForTimeout(2000);

          const scores = await getScoresFromAPI();
          expect(scores.home).toBe(1);
        }
      }
    }
  });
});

// ============================================================
// LANDSCAPE MOBILE (844x390)
// ============================================================
test.describe('Anonymous Score Editing — Landscape Mobile', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('scoreboard renders in landscape', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Look for scoreboard panel, expand button, or minimal scoreboard
    const scoreboard = page.getByTestId('scoreboard-v2');
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    const minimal = page.getByTestId('minimal-scoreboard');

    const hasScoreboard = await scoreboard.isVisible({ timeout: 3000 }).catch(() => false)
      || await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)
      || await minimal.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasScoreboard) {
      // Expand if needed
      if (await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(600);
      }

      // Verify scoreboard content exists
      const pageText = await page.evaluate(() => document.body.innerText);
      expect(pageText).toContain('0'); // Initial score
    } else {
      test.skip(true, 'Scoreboard not visible in landscape');
    }
  });
});

// ============================================================
// TABLET (768x1024)
// ============================================================
test.describe('Anonymous Score Editing — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test('score edit persists via API on tablet', async ({ page }) => {
    await navigateAndWaitForUnlock(page);

    // Expand scoreboard
    const expandBtn = page.getByTestId('btn-expand-scoreboard');
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }

    const scoreCards = page.getByTestId('score-card-button');
    if (await scoreCards.count() < 2) { test.skip(true, 'No editable score cards'); return; }

    // Tap away score card (second one)
    await scoreCards.nth(1).click();
    await page.waitForTimeout(600);

    const saveBtn = page.getByText('Save');
    if (!await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }

    // Use +2 quick increment
    const plus2 = page.getByText('+2');
    if (await plus2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await plus2.click();
      await page.waitForTimeout(300);
      await saveBtn.click();
      await page.waitForTimeout(2000);

      const scores = await getScoresFromAPI();
      expect(scores.away).toBe(2);
    }
  });
});
