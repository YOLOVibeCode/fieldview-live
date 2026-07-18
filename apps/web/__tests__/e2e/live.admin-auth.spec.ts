/**
 * Admin Authentication & RBAC — E2E Tests
 *
 * Covers: TC-AA-003, TC-AA-004, TC-AA-005, TC-AA-006
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdminUI } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;

test.describe('Admin Authentication & Security', () => {
  test.beforeEach(async () => {
    assertLiveWebEnv();
  });

  // TC-AA-003: Login with invalid credentials
  test('TC-AA-003: invalid credentials show error, no session created', async ({ page }) => {
    await page.goto(`${BASE_URL()}/admin/login`);

    await expect(page.getByRole('heading', { name: /Admin Login/i })).toBeVisible();

    // Wrong password
    await page.getByLabel(/Email/i).fill('admin@fieldview.live');
    await page.getByLabel(/Password/i).fill('definitelywrongpassword');
    await page.getByRole('button', { name: /Sign in/i }).click();

    // Error should appear
    const errorBanner = page.getByRole('alert').filter({ hasNotText: /route/i });
    await expect(errorBanner).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    expect(page.url()).toContain('/login');

    // No session token
    const token = await page.evaluate(() => localStorage.getItem('adminSessionToken'));
    expect(token).toBeNull();

    // Unknown email — same generic error (no email enumeration)
    await page.getByLabel(/Email/i).fill('nonexistent@nowhere.fake');
    await page.getByLabel(/Password/i).fill('anypassword');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  // TC-AA-004: Logout clears session and redirects
  test('TC-AA-004: sign out clears token and redirects to login', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());

    // Verify we're on console
    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();

    // Verify token exists
    const tokenBefore = await page.evaluate(() => localStorage.getItem('adminSessionToken'));
    expect(tokenBefore).toBeTruthy();

    // Click sign out
    await page.getByRole('button', { name: /Sign out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Token should be cleared
    const tokenAfter = await page.evaluate(() => localStorage.getItem('adminSessionToken'));
    expect(tokenAfter).toBeNull();
  });

  // TC-AA-005: Unauthenticated access redirects to login
  test('TC-AA-005: protected pages redirect to login without session', async ({ page }) => {
    // Clear any existing session
    await page.goto(`${BASE_URL()}/admin/login`);
    await page.evaluate(() => localStorage.clear());

    const protectedPaths = [
      '/admin/console',
      '/admin/revenue',
      '/admin/coupons',
    ];

    for (const path of protectedPaths) {
      await page.goto(`${BASE_URL()}${path}`);
      // Wait for client-side redirect
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
    }
  });

  // TC-AA-005 (continued): Superadmin page also protected
  test('TC-AA-005: superadmin streams page redirects without session', async ({ page }) => {
    await page.goto(`${BASE_URL()}/admin/login`);
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);
    await page.waitForTimeout(2000);

    // Should redirect to login or show access denied
    const onLogin = page.url().includes('/login');
    const hasAccessDenied = await page.getByText(/denied|unauthorized|login/i).isVisible().catch(() => false);
    expect(onLogin || hasAccessDenied).toBeTruthy();
  });

  // TC-AA-006: Support admin denied superadmin pages (API level)
  test('TC-AA-006: support_admin gets 401 on superadmin API endpoints', async ({ request }) => {
    const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;

    // Try to login as support_admin if test account exists
    const supportEmail = process.env.TEST_SUPPORT_ADMIN_EMAIL;
    const supportPassword = process.env.TEST_SUPPORT_ADMIN_PASSWORD;

    if (!supportEmail || !supportPassword) {
      test.skip(true, 'TEST_SUPPORT_ADMIN_EMAIL and TEST_SUPPORT_ADMIN_PASSWORD required');
      return;
    }

    const loginResp = await request.post(`${apiBase}/api/admin/login`, {
      data: { email: supportEmail, password: supportPassword },
    });

    if (!loginResp.ok()) {
      test.skip(true, 'Support admin login failed');
      return;
    }

    const loginJson = (await loginResp.json()) as any;
    if (loginJson.mfaRequired) {
      test.skip(true, 'Support admin has MFA enabled');
      return;
    }

    const token = loginJson.sessionToken;

    // Try superadmin-only endpoints
    const streamsResp = await request.get(`${apiBase}/api/admin/direct-streams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(streamsResp.status()).toBe(401);

    const createCouponResp = await request.post(`${apiBase}/api/admin/coupons`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: 'TESTFAIL', discountType: 'percentage', discountValue: 10 },
    });
    expect(createCouponResp.status()).toBe(403);
  });
});
