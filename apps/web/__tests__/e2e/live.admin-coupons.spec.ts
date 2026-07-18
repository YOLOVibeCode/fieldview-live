/**
 * Admin Coupons Management — E2E Tests
 *
 * Covers: TC-CN-004, TC-CN-009, TC-CN-010, TC-CN-011
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD (super_admin)
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdminUI, uniqueCode } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;

test.describe('Admin Coupons Management', () => {
  test.beforeEach(async () => {
    assertLiveWebEnv();
  });

  // TC-CN-004: Coupons page loads
  test('TC-CN-004: coupons page loads and lists coupons', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/coupons`);

    // Page heading
    await expect(page.getByRole('heading', { name: /Coupon Codes/i })).toBeVisible({ timeout: 10000 });

    // Loading spinner should resolve
    const spinner = page.getByText(/Loading coupons/i);
    if (await spinner.isVisible().catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    // Either coupon table or "No coupons created yet." should be visible
    const hasCoupons = await page.getByText(/total coupon/i).isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/No coupons created yet/i).isVisible().catch(() => false);
    expect(hasCoupons || hasEmpty).toBeTruthy();
  });

  // TC-CN-009: Create coupon — percentage discount
  test('TC-CN-009: create percentage discount coupon', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/coupons`);

    await expect(page.getByRole('heading', { name: /Coupon Codes/i })).toBeVisible({ timeout: 10000 });

    // Wait for list to load
    const spinner = page.getByText(/Loading coupons/i);
    if (await spinner.isVisible().catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    // Open create modal
    await page.getByRole('button', { name: /Create Coupon/i }).click();

    // Fill form
    const code = uniqueCode('TEST').toUpperCase().slice(0, 20);
    await page.locator('#code').fill(code);

    // Default type should be Percentage
    await page.locator('#discountValue').fill('15');
    await page.locator('#maxUses').fill('50');

    // Set future expiry
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await page.locator('#validTo').fill(futureDate);

    // Submit
    await page.getByRole('button', { name: /^Create Coupon$/i }).click();

    // Modal should close
    await page.waitForTimeout(2000);

    // New coupon should appear in list
    await expect(page.getByText(code)).toBeVisible({ timeout: 5000 });
  });

  // TC-CN-010: Create coupon — fixed amount
  test('TC-CN-010: create fixed amount discount coupon', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/coupons`);

    await expect(page.getByRole('heading', { name: /Coupon Codes/i })).toBeVisible({ timeout: 10000 });

    const spinner = page.getByText(/Loading coupons/i);
    if (await spinner.isVisible().catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    await page.getByRole('button', { name: /Create Coupon/i }).click();

    const code = uniqueCode('FLAT').toUpperCase().slice(0, 20);
    await page.locator('#code').fill(code);

    // Switch to Fixed Amount
    await page.locator('#discountType').selectOption('fixed_cents');

    // Value label should change
    await expect(page.getByText(/Amount Off/i)).toBeVisible();
    await page.locator('#discountValue').fill('5.00');

    // Leave max uses and expiry empty (unlimited, never)
    await page.getByRole('button', { name: /^Create Coupon$/i }).click();

    await page.waitForTimeout(2000);
    await expect(page.getByText(code)).toBeVisible({ timeout: 5000 });
  });

  // TC-CN-011: Disable active coupon
  test('TC-CN-011: disable an active coupon', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/admin/coupons`);

    await expect(page.getByRole('heading', { name: /Coupon Codes/i })).toBeVisible({ timeout: 10000 });

    const spinner = page.getByText(/Loading coupons/i);
    if (await spinner.isVisible().catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    // Find a Disable button (only active coupons have them)
    const disableButtons = page.getByRole('button', { name: /Disable/i });
    const count = await disableButtons.count();

    if (count === 0) {
      test.skip(true, 'No active coupons to disable');
      return;
    }

    // Click the first disable button
    await disableButtons.first().click();

    // Wait for API response and UI update
    await page.waitForTimeout(2000);

    // The coupon's status should now show "disabled" (gray badge)
    // At minimum, there should be one fewer disable button
    const newCount = await disableButtons.count();
    expect(newCount).toBeLessThan(count);
  });
});
