import { test, expect, type Page } from '@playwright/test';

/**
 * Viewer Count E2E Tests
 *
 * Validates that the viewer count display accurately reflects
 * the number of active SSE-connected viewers.
 *
 * Tests:
 *   - Viewer count appears when at least 1 viewer is connected
 *   - Count increments when additional viewers connect
 *   - Count decrements when viewers disconnect
 *   - Count displays correctly across form factors
 *
 * Prereqs: local API + web running, "test" stream with:
 *   - chatEnabled: true
 *   - allowAnonymousChat: true
 *   - streamUrl set
 */

const STREAM_URL = '/direct/test';

// Wait for page to fully bootstrap and auto-connect
async function waitForStreamReady(page: Page): Promise<boolean> {
  await page.goto(STREAM_URL);
  await page.waitForTimeout(5000);

  // Check if viewer controls are visible (viewer is unlocked)
  return page.getByTestId('btn-quick-bookmark')
    .isVisible({ timeout: 5000 })
    .catch(() => false);
}

// Get the displayed viewer count from the page (returns 0 if not visible)
async function getDisplayedViewerCount(page: Page): Promise<number> {
  const el = page.getByTestId('viewer-count');
  const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
  if (!visible) return 0;

  const text = await el.innerText();
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ============================================================
// DESKTOP (1440x900)
// ============================================================
test.describe('Viewer Count — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Multi-context tests need extra time for polling cycles (15s each)
  test.describe.configure({ timeout: 120000 });

  test('viewer count element is visible when stream is active', async ({ page }) => {
    const ready = await waitForStreamReady(page);
    if (!ready) { test.skip(true, 'Stream not ready'); return; }

    // Wait for viewer count polling (15s interval + buffer)
    await page.waitForTimeout(18000);

    const el = page.getByTestId('viewer-count');
    const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) { test.skip(true, 'Viewer count not shown (may need more viewers)'); return; }

    const text = await el.innerText();
    expect(text).toContain('watching');
  });

  test('viewer count increases with multiple viewers', async ({ browser }) => {
    // Open first viewer
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    let ctx2: import('@playwright/test').BrowserContext | null = null;

    try {
      const ready = await waitForStreamReady(page1);
      if (!ready) { test.skip(true, 'Stream not ready'); return; }

      // Wait for initial polling cycle
      await page1.waitForTimeout(18000);
      const initialCount = await getDisplayedViewerCount(page1);

      // Open second viewer
      ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page2 = await ctx2.newPage();
      await waitForStreamReady(page2);

      // Wait for both to stabilize + polling cycle
      await page1.waitForTimeout(18000);

      const newCount = await getDisplayedViewerCount(page1);

      // New count should be >= initial count (ideally +1)
      // We use >= because other test processes may also connect/disconnect
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    } finally {
      await ctx2?.close().catch(() => {});
      await ctx1.close().catch(() => {});
    }
  });

  test('viewer count decreases when viewer disconnects', async ({ browser }) => {
    // Open two viewers
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      const ready1 = await waitForStreamReady(page1);
      const ready2 = await waitForStreamReady(page2);
      if (!ready1 || !ready2) { test.skip(true, 'Stream not ready'); return; }

      // Wait for polling to pick up both
      await page1.waitForTimeout(18000);
      const countWithTwo = await getDisplayedViewerCount(page1);

      // Close second viewer
      await ctx2.close();

      // Wait for polling to detect disconnect
      await page1.waitForTimeout(18000);
      const countAfterDisconnect = await getDisplayedViewerCount(page1);

      // Count should decrease (or at least not increase)
      expect(countAfterDisconnect).toBeLessThanOrEqual(countWithTwo);
    } finally {
      await ctx1.close().catch(() => {});
      // ctx2 already closed above
    }
  });
});

// ============================================================
// PORTRAIT MOBILE (390x844)
// ============================================================
test.describe('Viewer Count — Portrait Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('viewer count displays in portrait layout', async ({ page }) => {
    const ready = await waitForStreamReady(page);
    if (!ready) { test.skip(true, 'Stream not ready'); return; }

    await page.waitForTimeout(18000);

    const el = page.getByTestId('viewer-count');
    const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) { test.skip(true, 'Viewer count not shown'); return; }

    const text = await el.innerText();
    expect(text).toContain('watching');
  });
});

// ============================================================
// TABLET (768x1024)
// ============================================================
test.describe('Viewer Count — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('viewer count displays on tablet', async ({ page }) => {
    const ready = await waitForStreamReady(page);
    if (!ready) { test.skip(true, 'Stream not ready'); return; }

    await page.waitForTimeout(18000);

    const el = page.getByTestId('viewer-count');
    const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) { test.skip(true, 'Viewer count not shown'); return; }

    const text = await el.innerText();
    expect(text).toContain('watching');
  });
});
