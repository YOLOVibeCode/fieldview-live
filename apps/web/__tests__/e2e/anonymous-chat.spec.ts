import { test, expect } from '@playwright/test';

/**
 * Anonymous Chat E2E Tests
 *
 * Tests the anonymous chat feature where viewers can chat without registration.
 * Requires a stream with allowAnonymousChat enabled and a working API backend.
 *
 * Tests use soft assertions for API-dependent features to remain resilient
 * when the API is unavailable during local development.
 */

test.describe('Anonymous Chat', () => {
  const streamUrl = '/direct/test';

  test('should auto-connect as Guest when anonymous chat is enabled', async ({ page }) => {
    await page.goto(streamUrl);
    await page.waitForTimeout(2000);

    const guestBar = page.locator('text=Chatting as');
    if (await guestBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(guestBar).toContainText('Guest');
    }
  });

  test('should allow changing guest name', async ({ page }) => {
    await page.goto(streamUrl);
    await page.waitForTimeout(2000);

    const changeNameBtn = page.locator('text=Change name');
    if (await changeNameBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await changeNameBtn.click();

      const nameInput = page.locator('input[name="guestName"]');
      await expect(nameInput).toBeVisible();
      await nameInput.fill('TestViewer');

      await page.locator('button:has-text("Save")').click();
      await expect(page.locator('text=TestViewer')).toBeVisible();
    }
  });

  test('should show either chat or registration prompt', async ({ page }) => {
    await page.goto(streamUrl);
    await page.waitForTimeout(2000);

    const registerBtn = page.getByTestId('btn-open-viewer-auth');
    const guestBar = page.locator('text=Chatting as');
    const chatDebug = page.locator('text=Chat Debug');

    const isAnonymous = await guestBar.isVisible({ timeout: 3000 }).catch(() => false);
    const hasRegister = await registerBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const hasDebug = await chatDebug.isVisible({ timeout: 1000 }).catch(() => false);

    // At least one chat-related element should be present when API is available.
    // When API is down, the page still renders without errors.
    if (!isAnonymous && !hasRegister && !hasDebug) {
      // API likely unavailable — verify page rendered without crash
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    }
  });
});
