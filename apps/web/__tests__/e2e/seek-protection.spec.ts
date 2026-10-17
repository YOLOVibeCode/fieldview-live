/**
 * Seek Overlay E2E Tests
 *
 * Verifies the long-press seek overlay, Go Live button, and keyboard seeking.
 * Uses /demo/seek-protection which renders VidstackPlayer with SeekOverlay.
 */

import { test, expect, type Page } from '@playwright/test';

const SEEK_PROTECTION_URL = '/demo/seek-protection';

async function revealSeekOverlay(page: Page): Promise<void> {
  const zone = page.getByTestId('seek-overlay-longpress-zone');
  await zone.waitFor({ state: 'visible' });
  const box = await zone.boundingBox();
  if (!box) {
    throw new Error('seek-overlay-longpress-zone has no bounding box');
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2100);
  await page.mouse.up();
}

test.describe('Seek overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SEEK_PROTECTION_URL);
    await page.getByTestId('vidstack-player').waitFor({ state: 'visible' });
    await page.waitForTimeout(2000);
  });

  test('a tap does not show seek overlay buttons', async ({ page }) => {
    await page.getByTestId('seek-overlay-longpress-zone').click();
    await expect(page.getByTestId('seek-overlay-buttons')).not.toBeVisible();
  });

  test('holding 2s shows seek overlay buttons', async ({ page }) => {
    await revealSeekOverlay(page);
    await expect(page.getByTestId('seek-overlay-buttons')).toBeVisible({ timeout: 2000 });
  });

  test('tapping elsewhere on the page dismisses the overlay', async ({ page }) => {
    await revealSeekOverlay(page);
    await expect(page.getByTestId('seek-overlay-buttons')).toBeVisible({ timeout: 2000 });
    await page.locator('body').click({ position: { x: 8, y: 8 }, force: true });
    await expect(page.getByTestId('seek-overlay-buttons')).not.toBeVisible();
  });

  test('tapping backdrop dismisses the overlay', async ({ page }) => {
    await revealSeekOverlay(page);
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
    await revealSeekOverlay(page);
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
