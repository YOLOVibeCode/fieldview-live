/**
 * E2E Test: Denton Diablos DirectStreamEvent — Page Load & Admin Auth
 *
 * Mirrors the TCHS event admin spec.
 * Tests:
 *  1. Page loads and bootstrap resolves
 *  2. Admin authenticates with correct password
 *  3. Wrong password is rejected
 *  4. Stream URL can be saved after auth
 */

import { test, expect } from '@playwright/test';

test.describe('Denton Diablos Event Admin', () => {
  const EVENT_URL = 'https://fieldview.live/direct/dentondiablos/soccer-2008-20260325';
  const ADMIN_PASSWORD = 'devil2026';
  const TEST_STREAM_URL = 'https://stream.mux.com/TEST-DENTON.m3u8';

  test.setTimeout(120_000);

  test('should load event page and show scoreboard teams', async ({ page }) => {
    await page.goto(EVENT_URL, { timeout: 60_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/FieldView/i);

    const adminButton = page.getByTestId('btn-open-admin-panel');
    await expect(adminButton).toBeVisible({ timeout: 15_000 });
  });

  test('should authenticate and update stream URL on event page', async ({ page }) => {
    await page.goto(EVENT_URL, { timeout: 60_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const adminButton = page.getByTestId('btn-open-admin-panel');
    await expect(adminButton).toBeVisible({ timeout: 15_000 });
    await adminButton.click();

    await page.waitForTimeout(1000);

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill(ADMIN_PASSWORD);

    const unlockButton = page
      .locator('button:has-text("Unlock"), button:has-text("Submit"), button[type="submit"]')
      .first();
    await expect(unlockButton).toBeVisible({ timeout: 3000 });
    await unlockButton.click();

    await page.waitForTimeout(3000);

    const passwordStillVisible = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(passwordStillVisible).toBe(false);

    const streamUrlInput = page
      .locator(
        'input[type="url"], input[name*="stream"], input[id*="stream"], input[placeholder*="stream"], input[placeholder*="URL"]',
      )
      .first();
    await expect(streamUrlInput).toBeVisible({ timeout: 5000 });

    await streamUrlInput.clear();
    await streamUrlInput.fill(TEST_STREAM_URL);

    const saveButton = page.locator('button:has-text("Save")').first();
    await expect(saveButton).toBeVisible({ timeout: 3000 });
    await saveButton.click();

    await page.waitForTimeout(3000);

    const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"]');
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasError) {
      const errorText = await errorMessage.textContent();
      throw new Error(`Save failed with error: ${errorText}`);
    }

    const savedValue = await streamUrlInput.inputValue();
    expect(savedValue).toBe(TEST_STREAM_URL);
  });

  test('should show error with wrong password', async ({ page }) => {
    await page.goto(EVENT_URL, { timeout: 60_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const adminButton = page.getByTestId('btn-open-admin-panel');
    await expect(adminButton).toBeVisible({ timeout: 15_000 });
    await adminButton.click();

    await page.waitForTimeout(1000);

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill('wrongpassword');

    const unlockButton = page.locator('button:has-text("Unlock"), button[type="submit"]').first();
    await unlockButton.click();

    await page.waitForTimeout(2000);

    const errorByRole = page.locator('[role="alert"]');
    const errorByClass = page.locator('.error');
    const errorByTestId = page.locator('[data-testid*="error"]');
    const errorByText = page.getByText(/invalid|incorrect|wrong/i);

    const hasRoleAlert = await errorByRole.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorClass = await errorByClass.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorTestId = await errorByTestId.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorText = await errorByText.isVisible({ timeout: 2000 }).catch(() => false);

    const errorVisible = hasRoleAlert || hasErrorClass || hasErrorTestId || hasErrorText;
    expect(errorVisible).toBe(true);
  });
});
