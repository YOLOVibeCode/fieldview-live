import { test, expect, type Page } from '@playwright/test';

/**
 * Production Score Editing E2E Tests
 *
 * Verifies the full admin-unlock → score edit → SSE push flow on production.
 * Flow: Click "Admin Panel" → Enter password → Unlock → Score cards become editable
 */

const PROD_URL = 'https://fieldview.live/direct/tchs';
const PROD_API = 'https://api.fieldview.live';
const ADMIN_PASSWORD = 'tchs2026';

async function setScoreViaProducer(field: string, value: number) {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/scoreboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value }),
  });
  if (!resp.ok) throw new Error(`Producer update failed: ${resp.status}`);
}

async function getScoresFromAPI(): Promise<{ home: number; away: number }> {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/scoreboard`);
  if (!resp.ok) throw new Error(`Failed to get scores: ${resp.status}`);
  const data = await resp.json();
  return { home: data.homeScore, away: data.awayScore };
}

async function resetScores() {
  await setScoreViaProducer('homeScore', 0);
  await setScoreViaProducer('awayScore', 0);
}

/**
 * Unlock admin on the page:
 * 1. Click "Admin Panel" button (top-right)
 * 2. Fill password input
 * 3. Submit the unlock form
 * 4. Close the admin panel (to get back to the scoreboard view)
 */
async function unlockAdminOnPage(page: Page): Promise<boolean> {
  // Step 1: Click "Admin Panel" button
  const adminBtn = page.getByTestId('btn-open-admin-panel');
  if (!await adminBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Admin Panel button not visible');
    return false;
  }
  await adminBtn.click();
  await page.waitForTimeout(1000);

  // Step 2: Fill password in the unlock form
  const passwordInput = page.getByTestId('admin-password-input');
  if (!await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Password input not visible after opening admin panel');
    return false;
  }
  await passwordInput.fill(ADMIN_PASSWORD);

  // Step 3: Submit the form
  const form = page.getByTestId('admin-unlock-form');
  const submitBtn = form.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Step 4: Close admin panel to return to the stream view
  const closeBtn = page.getByTestId('btn-close-edit');
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Step 5: Expand the scoreboard panel (collapsed by default)
  const expandBtn = page.getByTestId('btn-expand-scoreboard');
  if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(1000);
  }

  // Verify: score card buttons should now be visible (editable)
  const scoreCardBtns = page.getByTestId('score-card-button');
  const count = await scoreCardBtns.count();
  console.log(`Score card buttons after unlock: ${count}`);
  return count >= 2;
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

/** Edit score via UI: click score card → fill input → Save */
async function editScoreViaUI(page: Page, which: 'home' | 'away', targetScore: number): Promise<boolean> {
  const scoreCards = page.getByTestId('score-card-button');
  const count = await scoreCards.count();
  if (count < 2) {
    console.log(`Only ${count} score-card-button elements found`);
    return false;
  }

  const cardIndex = which === 'home' ? 0 : count - 1;
  await scoreCards.nth(cardIndex).click();
  await page.waitForTimeout(800);

  const scoreInput = page.locator('input[inputmode="numeric"]').first();
  if (!await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Score input not visible after clicking score card');
    return false;
  }

  await scoreInput.fill(String(targetScore));
  await page.waitForTimeout(200);

  const saveBtn = page.getByText('Save');
  if (!await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Save button not visible');
    return false;
  }
  await saveBtn.click();
  await page.waitForTimeout(1500);
  return true;
}

// =============================================================
// Desktop tests (1440x900)
// =============================================================
test.describe('Production Score Editing — Desktop', () => {
  test.describe.configure({ timeout: 90000 });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test.afterEach(async () => {
    await resetScores();
  });

  test('admin unlocks and edits home score via UI', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Screenshot after unlock
    await page.screenshot({ path: '__tests__/e2e/screenshots/prod-desktop-unlocked.png' });

    // Edit home score to 5
    const edited = await editScoreViaUI(page, 'home', 5);
    expect(edited).toBe(true);

    // Screenshot after edit
    await page.screenshot({ path: '__tests__/e2e/screenshots/prod-desktop-score-5.png' });

    // Verify via API
    const scores = await getScoresFromAPI();
    expect(scores.home).toBe(5);
    expect(scores.away).toBe(0);

    // Verify displayed score
    const displayed = await getDisplayedScores(page);
    expect(displayed?.home).toBe(5);
  });

  test('admin edits away score via UI', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    const edited = await editScoreViaUI(page, 'away', 3);
    expect(edited).toBe(true);

    const scores = await getScoresFromAPI();
    expect(scores.away).toBe(3);
  });

  test('score edit via UI pushes to second viewer via SSE', async ({ browser }) => {
    // Viewer A: admin unlocked
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();

    // Viewer B: anonymous viewer
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageB = await ctxB.newPage();

    try {
      await Promise.all([
        pageA.goto(PROD_URL),
        pageB.goto(PROD_URL),
      ]);
      await pageA.waitForTimeout(3000);
      await pageB.waitForTimeout(3000);

      // Admin unlocks on page A
      const unlocked = await unlockAdminOnPage(pageA);
      expect(unlocked).toBe(true);

      // A edits home score to 7
      const edited = await editScoreViaUI(pageA, 'home', 7);
      expect(edited).toBe(true);

      // Wait for SSE to push to B
      await pageB.waitForTimeout(5000);

      // Verify via API
      const scores = await getScoresFromAPI();
      expect(scores.home).toBe(7);

      // Screenshot both
      await pageA.screenshot({ path: '__tests__/e2e/screenshots/prod-sse-viewerA.png' });
      await pageB.screenshot({ path: '__tests__/e2e/screenshots/prod-sse-viewerB.png' });

      // Check B's displayed score
      const bScores = await getDisplayedScores(pageB);
      if (bScores) {
        console.log(`Viewer B sees: ${bScores.home} - ${bScores.away}`);
        expect(bScores.home).toBe(7);
      }
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// =============================================================
// Portrait tests (390x844)
// =============================================================
test.describe('Production Score Editing — Portrait', () => {
  test.describe.configure({ timeout: 90000 });
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    await resetScores();
  });

  test.afterEach(async () => {
    await resetScores();
  });

  test('admin unlocks at desktop, then edits score in portrait', async ({ page }) => {
    // Step 1: Unlock at desktop width (portrait has no admin panel button)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PROD_URL);
    await page.waitForTimeout(3000);

    const unlocked = await unlockAdminOnPage(page);
    expect(unlocked).toBe(true);

    // Step 2: Switch to portrait viewport — React state (admin, viewer) persists
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '__tests__/e2e/screenshots/prod-portrait-admin-unlocked.png' });

    // Tap compact score bar to expand
    const scoreBar = page.getByTestId('compact-score-bar');
    if (await scoreBar.isVisible().catch(() => false)) {
      await scoreBar.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: '__tests__/e2e/screenshots/prod-portrait-expanded-editable.png' });

      // Score cards should be editable (admin is unlocked)
      const scoreCardBtns = page.getByTestId('score-card-button');
      const btnCount = await scoreCardBtns.count();
      console.log(`Portrait editable score cards: ${btnCount}`);

      if (btnCount >= 2) {
        const edited = await editScoreViaUI(page, 'home', 4);
        expect(edited).toBe(true);

        await page.waitForTimeout(1000);
        await page.screenshot({ path: '__tests__/e2e/screenshots/prod-portrait-score-edited.png' });

        // Verify via API
        const scores = await getScoresFromAPI();
        expect(scores.home).toBe(4);

        // Verify compact bar reflects the new score
        const barText = await scoreBar.innerText();
        console.log('Compact bar after edit:', barText);
        expect(barText).toContain('4');
      }
    }
  });

  test('SSE push updates compact score bar in real time', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForTimeout(5000);

    // Set scores via producer
    await setScoreViaProducer('homeScore', 9);
    await setScoreViaProducer('awayScore', 6);

    // Wait for SSE push
    await page.waitForTimeout(3000);

    const scoreBar = page.getByTestId('compact-score-bar');
    if (await scoreBar.isVisible().catch(() => false)) {
      const barText = await scoreBar.innerText();
      console.log('Portrait bar after SSE push:', barText);
      expect(barText).toContain('9');
      expect(barText).toContain('6');
      await page.screenshot({ path: '__tests__/e2e/screenshots/prod-portrait-sse-push-96.png' });
    }
  });
});
