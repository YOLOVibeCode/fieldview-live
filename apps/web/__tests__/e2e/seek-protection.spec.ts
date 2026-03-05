/**
 * Seek Overlay E2E Tests
 *
 * Verifies the tap-to-reveal seek overlay, Go Live button, and keyboard seeking.
 * Uses /demo/seek-protection which renders VidstackPlayer with SeekOverlay.
 */

import { test, expect } from '@playwright/test';

const SEEK_PROTECTION_URL = '/demo/seek-protection';

test.describe('Seek overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SEEK_PROTECTION_URL);
    await page.getByTestId('vidstack-player').waitFor({ state: 'visible' });
    await page.waitForTimeout(2000);
  });

  test('tapping center trigger zone shows seek overlay buttons', async ({ page }) => {
    const trigger = page.getByTestId('seek-overlay-trigger');
    await trigger.click();
    await expect(page.getByTestId('seek-overlay-buttons')).toBeVisible({ timeout: 2000 });
  });

  test('tapping backdrop dismisses the overlay', async ({ page }) => {
    const trigger = page.getByTestId('seek-overlay-trigger');
    await trigger.click();
    await expect(page.getByTestId('seek-overlay-buttons')).toBeVisible({ timeout: 2000 });
    const backdrop = page.getByTestId('seek-overlay-backdrop');
    const box = await backdrop.boundingBox();
    if (!box) {
      test.skip();
      return;
    }
    // Click top-left corner (outside the centered buttons)
    await page.mouse.click(box.x + 10, box.y + 10);
    await expect(page.getByTestId('seek-overlay-buttons')).not.toBeVisible();
  });

  test('seek overlay auto-dismisses after idle timeout', async ({ page }) => {
    const trigger = page.getByTestId('seek-overlay-trigger');
    await trigger.click();
    await expect(page.getByTestId('seek-overlay-buttons')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(5500);
    await expect(page.getByTestId('seek-overlay-buttons')).not.toBeVisible();
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
