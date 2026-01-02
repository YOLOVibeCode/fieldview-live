/**
 * Owner Authentication Tests
 * 
 * Tests owner login flow, session persistence, and logout.
 */

import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, createTestOwner, cleanupTestData } from '../helpers/test-fixtures';

test.beforeAll(() => {
  assertLiveWebEnv();
});

test.afterAll(async ({ request }) => {
  await cleanupTestData(request);
});

test('OA-01: valid email/password login redirects to dashboard', async ({
  page,
  request,
}) => {
  // Arrange: Create test owner
  const owner = await createTestOwner(request);

  // Act: Navigate to login page
  await page.goto('/owners/login');

  // Fill login form using accessibility-first selectors
  await page.getByLabel(/Email/i).fill(owner.email);
  await page.getByLabel(/Password/i).fill(owner.password);
  await page.getByRole('button', { name: /Sign in/i }).click();

  // Assert: Redirected to dashboard
  await expect(page).toHaveURL(/\/owners\/dashboard/);
});

test('OA-02: invalid password shows error message', async ({ page, request }) => {
  const owner = await createTestOwner(request);

  await page.goto('/owners/login');

  // Try login with wrong password
  await page.getByTestId('input-email').fill(owner.email);
  await page.getByTestId('input-password').fill('wrongpassword');
  await page.getByTestId('btn-submit-login').click();

  // Wait for API response
  await page.waitForResponse(
    (response) => response.url().includes('/api/owners/login'),
    { timeout: 10000 }
  );

  // Assert: Error message visible with role="alert"
  const errorAlert = page.getByTestId('error-login');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText(/password|invalid|failed/i);
});

test('OA-03: session persists on refresh', async ({ page, request }) => {
  const owner = await createTestOwner(request);

  // Login via API to get token
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const loginResponse = await request.post(`${apiBase}/api/owners/login`, {
    data: {
      email: owner.email,
      password: owner.password,
    },
  });

  expect(loginResponse.ok()).toBeTruthy();

  const loginJson = (await loginResponse.json()) as any;
  const token = loginJson.token.token as string;
  const expiresAt = loginJson.token.expiresAt as string;

  // Set token in localStorage via page context
  await page.goto('/owners/login');
  await page.evaluate(
    ({ t, e }) => {
      localStorage.setItem('owner_token', t);
      localStorage.setItem('owner_token_expires', e);
    },
    { t: token, e: expiresAt }
  );

  // Navigate to dashboard
  await page.goto('/owners/dashboard');

  // Refresh page
  await page.reload();

  // Assert: Still on dashboard (session persisted)
  await expect(page).toHaveURL(/\/owners\/dashboard/);
});

test('OA-04: logout clears session', async ({ page, request }) => {
  const owner = await createTestOwner(request);

  // Login via API
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const loginResponse = await request.post(`${apiBase}/api/owners/login`, {
    data: {
      email: owner.email,
      password: owner.password,
    },
  });

  const loginJson = (await loginResponse.json()) as any;
  const token = loginJson.token.token as string;
  const expiresAt = loginJson.token.expiresAt as string;

  // Set token in localStorage via page context
  await page.goto('/owners/login');
  await page.evaluate(
    ({ t, e }) => {
      localStorage.setItem('owner_token', t);
      localStorage.setItem('owner_token_expires', e);
    },
    { t: token, e: expiresAt }
  );

  // Navigate to dashboard
  await page.goto('/owners/dashboard');
  await expect(page).toHaveURL(/\/owners\/dashboard/);

  // Click logout button
  await page.getByRole('button', { name: /Logout/i }).click();

  // Assert: Redirected to login
  await expect(page).toHaveURL(/\/owners\/login/);
});

