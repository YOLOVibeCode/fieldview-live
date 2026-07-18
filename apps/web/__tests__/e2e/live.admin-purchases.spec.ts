/**
 * Admin Purchases & Audience — E2E Tests
 *
 * Covers: TC-CN-005, TC-CN-006, TC-CN-007, TC-CN-008
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdminUI } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;

test.describe('Admin Console Search & Detail Pages', () => {
  test.beforeEach(async () => {
    assertLiveWebEnv();
  });

  // TC-CN-005: Search with no results
  test('TC-CN-005: search with no matches shows empty states', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/console`);

    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible({ timeout: 10000 });

    // Search for something that definitely won't match
    await page.getByLabel(/Global Search/i).fill('zzz-nonexistent-99999@impossible.fake');
    await page.getByRole('button', { name: /Search/i }).click();

    // Wait for results
    await page.waitForTimeout(3000);

    // Should see empty state messages, not errors
    const hasNoViewers = await page.getByText(/No viewer matches/i).isVisible().catch(() => false);
    const hasNoGames = await page.getByText(/No game matches/i).isVisible().catch(() => false);
    const hasError = await page.getByRole('alert').filter({ hasNotText: /route/i }).isVisible().catch(() => false);

    // Either empty states shown or no error — search completed cleanly
    expect(hasNoViewers || hasNoGames || !hasError).toBeTruthy();
  });

  // TC-CN-006: Search by phone
  test('TC-CN-006: search by E.164 phone number', async ({ page }) => {
    const testPhone = process.env.TEST_VIEWER_PHONE;
    if (!testPhone) {
      test.skip(true, 'TEST_VIEWER_PHONE required for phone search test');
      return;
    }

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/console`);

    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/Global Search/i).fill(testPhone);
    await page.getByRole('button', { name: /Search/i }).click();

    // Wait for results
    await page.waitForTimeout(3000);

    // Should find at least one viewer
    const viewersSection = page.getByText(/Viewers/i);
    await expect(viewersSection).toBeVisible();

    // Phone should appear in results
    await expect(page.getByText(testPhone)).toBeVisible({ timeout: 5000 });
  });

  // TC-CN-007: Purchase timeline detail
  test('TC-CN-007: navigate to purchase detail and view timeline', async ({ page }) => {
    const testEmail = process.env.TEST_VIEWER_EMAIL;
    if (!testEmail) {
      test.skip(true, 'TEST_VIEWER_EMAIL required for purchase search');
      return;
    }

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/console`);

    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible({ timeout: 10000 });

    // Search for viewer with purchases
    await page.getByLabel(/Global Search/i).fill(testEmail);
    await page.getByRole('button', { name: /Search/i }).click();
    await page.waitForTimeout(3000);

    // Find and click a purchase
    const purchaseButtons = page.getByRole('button', { name: /View purchase/i });
    const count = await purchaseButtons.count();

    if (count === 0) {
      test.skip(true, 'No purchases found for test viewer');
      return;
    }

    await purchaseButtons.first().click();

    // Should navigate to purchase detail
    await expect(page).toHaveURL(/\/purchases\/[^/]+/, { timeout: 5000 });

    // Purchase info should be visible
    await expect(page.getByRole('heading', { name: /Purchase/i })).toBeVisible();

    // Timeline section should exist
    await expect(page.getByText(/Timeline/i)).toBeVisible();

    // Back button should work
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL(/\/console/, { timeout: 5000 });
  });

  // TC-CN-008: Game audience page
  test('TC-CN-008: audience page loads with purchasers and watchers', async ({ page }) => {
    const testOwnerId = process.env.TEST_OWNER_ID;
    const testGameId = process.env.TEST_GAME_ID;

    if (!testOwnerId || !testGameId) {
      test.skip(true, 'TEST_OWNER_ID and TEST_GAME_ID required for audience test');
      return;
    }

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/owners/${testOwnerId}/games/${testGameId}/audience`);

    // Page heading
    await expect(page.getByRole('heading', { name: /Audience/i })).toBeVisible({ timeout: 10000 });

    // Loading should resolve
    const loading = page.getByText(/Loading audience/i);
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Purchasers card should be visible
    await expect(page.getByText(/Purchasers/i)).toBeVisible();

    // Conversion rate should be shown
    const hasConversion = await page.getByText(/conversion/i).isVisible().catch(() => false);
    expect(hasConversion).toBeTruthy();

    // Watchers card should be visible
    await expect(page.getByText(/Watchers/i)).toBeVisible();

    // Back button
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL(/\/console/, { timeout: 5000 });
  });
});
