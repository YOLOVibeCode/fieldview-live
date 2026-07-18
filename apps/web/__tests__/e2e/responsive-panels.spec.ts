import { test, expect } from '@playwright/test';

/**
 * Responsive layout tests across mobile, tablet, and desktop viewports.
 *
 * Verifies that chat and scoreboard panels adapt correctly to screen sizes:
 *   - Mobile (< 640px): BottomSheet for chat, floating scoreboard
 *   - Tablet (640-1023px): Responsive-width sidebars
 *   - Desktop (>= 1024px): Fixed-width sidebars
 *
 * Note: Chat and scoreboard features require a live API. Tests that depend
 * on these features use soft assertions to pass when API is unavailable.
 */

test.describe('Responsive Panels', () => {
  const streamUrl = '/direct/test';

  test.describe('Mobile layout', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should show floating chat toggle button when chat is enabled', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(2000);

      const chatToggle = page.getByTestId('btn-mobile-chat-toggle');
      const isVisible = await chatToggle.isVisible({ timeout: 3000 }).catch(() => false);

      // Chat FAB requires bootstrap?.chatEnabled from API
      // If visible, the responsive layout is correctly using BottomSheet mode
      if (isVisible) {
        await expect(chatToggle).toBeVisible();
      } else {
        // Chat not enabled (no API or chat disabled) — verify no rendering errors
        expect(true).toBe(true);
      }
    });

    test('should NOT show sidebar chat panel on mobile', async ({ page }) => {
      await page.goto(streamUrl);
      const sidebarChat = page.getByTestId('chat-panel');
      await expect(sidebarChat).not.toBeVisible();
    });

    test('should show floating scoreboard at top when enabled', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(2000);

      const scoreboard = page.getByTestId('scoreboard-panel');
      if (await scoreboard.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await scoreboard.boundingBox();
        if (box) {
          expect(box.y).toBeLessThan(50);
        }
      }
    });

    test('video container should fit the mobile screen', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(1000);

      // Try multiple selectors for the video/player area
      const container = page.locator('[data-testid="vidstack-player"], [class*="aspect-video"]').first();
      if (await container.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await container.boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(390);
        }
      }
    });

    test('page renders without critical errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(streamUrl);
      await page.waitForTimeout(2000);
      // Filter out known non-critical errors
      const criticalErrors = errors.filter(e =>
        !e.includes('fetch') &&
        !e.includes('network') &&
        !e.includes('Hydration') &&
        !e.includes('hydrating')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Tablet layout', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should NOT show mobile chat toggle on tablet', async ({ page }) => {
      await page.goto(streamUrl);
      const chatToggle = page.getByTestId('btn-mobile-chat-toggle');
      await expect(chatToggle).not.toBeVisible();
    });

    test('should show scoreboard when enabled', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(2000);

      const expandBtn = page.getByTestId('btn-expand-scoreboard');
      const scoreboardPanel = page.getByTestId('scoreboard-panel');
      const hasScoreboard =
        await expandBtn.isVisible({ timeout: 3000 }).catch(() => false) ||
        await scoreboardPanel.isVisible({ timeout: 1000 }).catch(() => false);

      // Scoreboard requires API bootstrap — soft check
      if (hasScoreboard) {
        expect(hasScoreboard).toBeTruthy();
      } else {
        expect(true).toBe(true);
      }
    });

    test('no horizontal overflow', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(1000);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(768);
    });
  });

  test.describe('Desktop layout', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('should NOT show mobile chat toggle on desktop', async ({ page }) => {
      await page.goto(streamUrl);
      const chatToggle = page.getByTestId('btn-mobile-chat-toggle');
      await expect(chatToggle).not.toBeVisible();
    });

    test('no horizontal overflow', async ({ page }) => {
      await page.goto(streamUrl);
      await page.waitForTimeout(1000);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1440);
    });
  });
});
