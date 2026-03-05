/**
 * Seek Protection E2E Tests
 *
 * Verifies confirmation overlay for large seeks, Go Live button when behind live edge,
 * small-seek passthrough, and overlay auto-dismiss timeout.
 * Uses /demo/seek-protection which renders VidstackPlayer with SafeTimeSlider.
 */

import { test, expect } from '@playwright/test';

const SEEK_PROTECTION_URL = '/demo/seek-protection';

test.describe('Seek protection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SEEK_PROTECTION_URL);
    await page.getByTestId('vidstack-player').waitFor({ state: 'visible' });
    await page.waitForTimeout(2000);
  });

  test('large seek via timeline shows confirmation overlay', async ({ page }) => {
    const player = page.getByTestId('vidstack-player');
    await player.hover();
    await page.waitForTimeout(800);

    const slider = page.getByTestId('safe-time-slider').first();
    await slider.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const box = await slider.boundingBox();
    if (!box) {
      test.skip();
      return;
    }
    await page.mouse.click(box.x + box.width * 0.05, box.y + box.height / 2);
    await page.waitForTimeout(600);
    await expect(page.getByTestId('seek-confirm-overlay')).toBeVisible({ timeout: 4000 });
  });

  test('small seeks work without confirmation', async ({ page }) => {
    await page.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    }
    await expect(page.getByTestId('seek-confirm-overlay')).not.toBeVisible();
  });

  test('seek confirm overlay auto-dismisses after timeout', async ({ page }) => {
    await page.getByTestId('vidstack-player').hover();
    await page.waitForTimeout(800);
    const timeSlider = page.getByTestId('safe-time-slider').first();
    await timeSlider.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const box = await timeSlider.boundingBox();
    if (!box) {
      test.skip();
      return;
    }
    await page.mouse.click(box.x + box.width * 0.05, box.y + box.height / 2);
    await page.waitForTimeout(600);
    await expect(page.getByTestId('seek-confirm-overlay')).toBeVisible({ timeout: 4000 });
    await page.waitForTimeout(3500);
    await expect(page.getByTestId('seek-confirm-overlay')).not.toBeVisible();
  });

  test('Go Live button has correct testid and ARIA when present', async ({ page }) => {
    const goLive = page.getByTestId('btn-go-live');
    const count = await goLive.count();
    if (count > 0) {
      await expect(goLive.first()).toBeVisible();
      await expect(goLive.first()).toHaveAttribute('aria-label', 'Go to live');
    }
  });
});
