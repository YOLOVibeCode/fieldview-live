/**
 * Admin Revenue Dashboard — E2E Tests
 *
 * Covers: TC-CN-003
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdminUI } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;

test.describe('Admin Revenue Dashboard', () => {
  test.beforeEach(async () => {
    assertLiveWebEnv();
  });

  // TC-CN-003: Revenue summary page loads
  test('TC-CN-003: revenue dashboard loads with summary cards', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/revenue`);

    // Page heading
    await expect(page.getByRole('heading', { name: /Platform Revenue/i })).toBeVisible({ timeout: 10000 });

    // Loading state should resolve
    const spinner = page.getByText(/Loading revenue data/i);
    if (await spinner.isVisible().catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    // Summary cards should be visible
    await expect(page.getByText(/Platform Revenue \(All Time\)/i)).toBeVisible();
    await expect(page.getByText(/This Month/i)).toBeVisible();
    await expect(page.getByText(/This Week/i)).toBeVisible();
    await expect(page.getByText(/Total Gross Volume/i)).toBeVisible();

    // Values should be formatted as currency (contain $)
    const allTimeCard = page.getByText(/Platform Revenue \(All Time\)/i).locator('..');
    await expect(allTimeCard).toContainText('$');

    // Monthly Revenue section
    await expect(page.getByText(/Monthly Revenue/i)).toBeVisible();

    // Top Owners section
    await expect(page.getByText(/Top Owners by Revenue/i)).toBeVisible();
  });

  // TC-CN-003 (navigation): Console link works
  test('TC-CN-003: console link navigates back to admin console', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/revenue`);

    await expect(page.getByRole('heading', { name: /Platform Revenue/i })).toBeVisible({ timeout: 10000 });

    // Click Console button
    await page.getByRole('link', { name: /Console/i }).or(page.getByRole('button', { name: /Console/i })).click();

    await expect(page).toHaveURL(/\/console/, { timeout: 5000 });
  });
});
