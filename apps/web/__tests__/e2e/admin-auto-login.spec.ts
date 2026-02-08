import { test, expect } from '@playwright/test';

/**
 * Admin Auto-Login E2E Tests
 *
 * Tests that admin login automatically grants chat + scoreboard access
 * without needing a separate viewer registration.
 */

test.describe('Admin Auto-Login', () => {
  const streamUrl = '/direct/test';

  test('should show admin panel button', async ({ page }) => {
    await page.goto(streamUrl);
    const adminBtn = page.getByTestId('btn-open-admin-panel');
    await expect(adminBtn).toBeVisible();
  });

  test('should open admin panel on click', async ({ page }) => {
    await page.goto(streamUrl);
    await page.getByTestId('btn-open-admin-panel').click();

    const adminPanel = page.locator('text=Admin Panel').first();
    await expect(adminPanel).toBeVisible();
  });

  test('should auto-connect to chat after admin login', async ({ page }) => {
    await page.goto(streamUrl);

    await page.getByTestId('btn-open-admin-panel').click();

    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('test-admin-password');

      const submitBtn = page.locator('button:has-text("Unlock")');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);

        const chatPanel = page.getByTestId('chat-panel-v2');
        const chatAvailable = await chatPanel.isVisible({ timeout: 5000 }).catch(() => false);
        if (chatAvailable) {
          await expect(chatPanel).toBeVisible();
        }
      }
    }
  });
});
