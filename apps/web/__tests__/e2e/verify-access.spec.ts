import { test, expect } from '@playwright/test';

/**
 * Verify Access Page E2E Tests
 *
 * Tests the viewer access link verification flow (email magic link).
 * Covers success (valid token) and error (invalid/expired token) paths.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4300';

test.describe('Verify Access Page', () => {
  test('should show success state with valid token (mocked)', async ({ page }) => {
    // Mock the verification API to return success
    await page.route('**/api/auth/viewer-refresh/verify/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          redirectUrl: '/direct/test-stream',
        }),
      });
    });

    // Visit the verify-access page with a token
    await page.goto(`${BASE_URL}/verify-access?token=test-valid-token-123`);

    // Should show "Verifying Access" initially
    await expect(page.getByTestId('verifying-state')).toBeVisible();

    // Should transition to success state
    await expect(page.getByText(/Access Restored/i)).toBeVisible({ timeout: 5000 });

    // Should show countdown
    await expect(page.getByTestId('countdown')).toBeVisible();

    // Should show "Continue Watching Now" button
    await expect(page.getByTestId('btn-continue')).toBeVisible();
  });

  test('should show error state with invalid token', async ({ page }) => {
    // Mock the verification API to return error
    await page.route('**/api/auth/viewer-refresh/verify/**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: false,
          error: 'Token expired',
        }),
      });
    });

    // Visit the verify-access page with an invalid token
    await page.goto(`${BASE_URL}/verify-access?token=test-invalid-token-456`);

    // Should show "Verifying Access" initially
    await expect(page.getByTestId('verifying-state')).toBeVisible();

    // Should transition to error state
    await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 5000 });

    // Should show the error message
    await expect(page.getByText(/Token expired/i)).toBeVisible();

    // Should show "Back to Home" button
    await expect(page.getByTestId('btn-back-home')).toBeVisible();
  });

  test('should show error when no token provided', async ({ page }) => {
    // Visit without a token
    await page.goto(`${BASE_URL}/verify-access`);

    // Should immediately show error state (no verifying state)
    await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 3000 });

    // Should show "No access token provided" or similar message
    await expect(page.getByText(/No access token|Invalid|expired/i)).toBeVisible();
  });

  test('should redirect after countdown completes on success (mocked)', async ({ page }) => {
    await page.route('**/api/auth/viewer-refresh/verify/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          redirectUrl: '/direct/test-stream',
        }),
      });
    });

    await page.goto(`${BASE_URL}/verify-access?token=test-redirect-token`);

    await expect(page.getByText(/Access Restored/i)).toBeVisible({ timeout: 5000 });

    // Wait for redirect (countdown is 3 seconds, add buffer)
    await expect(page).toHaveURL(/\/direct\/test-stream/, { timeout: 5000 });
  });

  test('should allow manual navigation via Continue button', async ({ page }) => {
    await page.route('**/api/auth/viewer-refresh/verify/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          redirectUrl: '/direct/test-stream',
        }),
      });
    });

    await page.goto(`${BASE_URL}/verify-access?token=test-manual-nav`);

    await expect(page.getByTestId('btn-continue')).toBeVisible({ timeout: 5000 });

    // Click the button before countdown completes
    await page.getByTestId('btn-continue').click();

    // Should redirect immediately
    await expect(page).toHaveURL(/\/direct\/test-stream/, { timeout: 3000 });
  });
});
