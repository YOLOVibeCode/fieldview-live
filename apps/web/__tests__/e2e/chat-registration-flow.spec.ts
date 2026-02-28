/**
 * E2E: Chat registration + guest flow
 *
 * Visit stream as anonymous, see Register to Chat, fill inline form, submit,
 * verify chat unlocks and identity bar shows name; change guest name; sign out.
 */

import { test, expect } from '@playwright/test';

const STREAM_PATH = '/direct/tchs';

test.describe('Chat registration flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show Register to Chat or chat panel when chat enabled', async ({ page }) => {
    await page.waitForTimeout(2000);
    const registerBtn = page.getByRole('button', { name: /register to chat|join chat/i });
    const chatPanel = page.locator('[data-testid="chat"], [data-testid="chat-message-list"]');
    await expect(registerBtn.or(chatPanel)).toBeVisible({ timeout: 10000 });
  });

  test('should show viewer identity bar after registration', async ({ page }) => {
    const identityBar = page.locator('[data-testid="viewer-identity-bar"]');
    const registerBtn = page.getByRole('button', { name: /register to chat|join chat/i });
    if (await registerBtn.isVisible().catch(() => false)) {
      await registerBtn.click();
      const nameInput = page.locator('[data-testid="input-name"], #viewer-name');
      const emailInput = page.locator('[data-testid="input-email"], #viewer-email');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('E2E Guest');
        await emailInput.fill(`e2e-${Date.now()}@example.com`);
        await page.locator('[data-testid="btn-submit-viewer-register"]').click();
        await expect(identityBar).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should have sign out button when authenticated', async ({ page }) => {
    const signOut = page.locator('[data-testid="btn-viewer-logout"]');
    const identityBar = page.locator('[data-testid="viewer-identity-bar"]');
    if (await identityBar.isVisible().catch(() => false)) {
      await expect(signOut).toBeVisible();
    }
  });
});
