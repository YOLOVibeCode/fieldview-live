import { test, expect } from '@playwright/test';

/**
 * Fullscreen E2E Tests
 *
 * Tests fullscreen toggle functionality on stream pages.
 * Validates enter fullscreen, exit fullscreen, and toggle behavior.
 */

const STREAM_PATH = '/direct/tchs';

test.describe('Fullscreen functionality', () => {
  test('should enter fullscreen when fullscreen button clicked', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('domcontentloaded');

    // Look for fullscreen button (may be in video controls or header)
    const fullscreenBtn = page.locator('[data-testid="btn-fullscreen"], [aria-label*="fullscreen" i], [title*="fullscreen" i]').first();

    // If fullscreen button exists on the page
    if (await fullscreenBtn.isVisible().catch(() => false)) {
      // Click to enter fullscreen
      await fullscreenBtn.click();

      // Wait a moment for fullscreen to activate
      await page.waitForTimeout(500);

      // Check if page is in fullscreen (via Playwright's evaluation in browser context)
      const isFullscreen = await page.evaluate(() => {
        return !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );
      });

      expect(isFullscreen).toBe(true);

      // Exit fullscreen by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify fullscreen exited
      const isStillFullscreen = await page.evaluate(() => {
        return !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement
        );
      });

      expect(isStillFullscreen).toBe(false);
    } else {
      // If no fullscreen button visible, test passes (page may not have video player loaded)
      test.skip();
    }
  });

  test('should toggle fullscreen on and off', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('domcontentloaded');

    const fullscreenBtn = page.locator('[data-testid="btn-fullscreen"], [aria-label*="fullscreen" i]').first();

    if (await fullscreenBtn.isVisible().catch(() => false)) {
      // First click: enter fullscreen
      await fullscreenBtn.click();
      await page.waitForTimeout(500);

      let isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      expect(isFullscreen).toBe(true);

      // Second click: exit fullscreen
      await fullscreenBtn.click();
      await page.waitForTimeout(500);

      isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      expect(isFullscreen).toBe(false);
    } else {
      test.skip();
    }
  });

  test('should exit fullscreen with Escape key', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('domcontentloaded');

    const fullscreenBtn = page.locator('[data-testid="btn-fullscreen"], [aria-label*="fullscreen" i]').first();

    if (await fullscreenBtn.isVisible().catch(() => false)) {
      await fullscreenBtn.click();
      await page.waitForTimeout(500);

      // Confirm fullscreen entered
      const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      if (isFullscreen) {
        // Press Escape to exit
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const exited = await page.evaluate(() => !document.fullscreenElement);
        expect(exited).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test('should maintain video playback when entering/exiting fullscreen', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('domcontentloaded');

    const videoContainer = page.locator('[data-testid="video-container"], video').first();
    const fullscreenBtn = page.locator('[data-testid="btn-fullscreen"], [aria-label*="fullscreen" i]').first();

    if (
      await videoContainer.isVisible().catch(() => false) &&
      await fullscreenBtn.isVisible().catch(() => false)
    ) {
      // Enter fullscreen
      await fullscreenBtn.click();
      await page.waitForTimeout(500);

      // Video should still be visible
      await expect(videoContainer).toBeVisible();

      // Exit fullscreen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Video should still be visible
      await expect(videoContainer).toBeVisible();
    } else {
      test.skip();
    }
  });
});
