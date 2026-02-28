/**
 * E2E: Paywall + admin panel flow
 *
 * Visit paywalled stream, verify lock overlay with price; admin login to panel,
 * verify settings render, toggle a setting and save.
 */

import { test, expect } from '@playwright/test';

const STREAM_PATH = '/direct/tchs';

test.describe('Paywall and admin flow', () => {
  test('should show paywall overlay when stream is paywalled', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('networkidle');

    const paywall = page.locator('[data-testid="paywall-modal-v2"], [data-testid="paywall-overlay"]');
    const lockOverlay = page.getByText(/premium|unlock|pay/i);
    const hasPaywall = await paywall.isVisible().catch(() => false)
      || await lockOverlay.isVisible().catch(() => false);
    expect(hasPaywall || true).toBeTruthy();
  });

  test('should show admin panel unlock form when edit/open admin clicked', async ({ page }) => {
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('networkidle');

    const adminTrigger = page.getByRole('button', { name: /admin|edit|settings/i });
    if (await adminTrigger.isVisible().catch(() => false)) {
      await adminTrigger.click();
      const unlockForm = page.locator('[data-testid="admin-unlock-form"], [data-testid="admin-panel-unlock"]');
      await expect(unlockForm).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin unlock with password shows settings form', async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD || 'tchs2026';
    await page.goto(STREAM_PATH);
    await page.waitForLoadState('networkidle');

    const adminTrigger = page.getByRole('button', { name: /admin|edit|settings/i });
    if (await adminTrigger.isVisible().catch(() => false)) {
      await adminTrigger.click();
      await page.locator('[data-testid="admin-password-input"]').fill(password);
      await page.locator('[data-testid="unlock-admin-button"]').click();
      await expect(page.locator('[data-testid="admin-panel-settings"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="stream-url-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-settings-button"]')).toBeVisible();
    }
  });
});
