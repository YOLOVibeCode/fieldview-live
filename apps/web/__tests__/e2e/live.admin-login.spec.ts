import { test, expect } from '@playwright/test';

function assertLiveWebEnv() {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error('LIVE web tests require LIVE_TEST_MODE=1. Refusing to run.');
  }
  const base = process.env.PLAYWRIGHT_BASE_URL;
  if (!base) {
    throw new Error('Set PLAYWRIGHT_BASE_URL (e.g., http://localhost:3000) for LIVE web tests.');
  }
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL;
  if (!apiBase) {
    throw new Error('Set PLAYWRIGHT_API_BASE_URL (e.g., http://localhost:3001) for LIVE web tests.');
  }
}

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}@fieldview.live`;
}

test('LIVE: admin login form uses automation-friendly selectors', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const adminEmail = uniqueEmail('admin');

  // Create admin account via API (assuming endpoint exists)
  // Note: This may need to be adjusted based on your actual admin creation flow
  const createAdmin = await request.post(`${apiBase}/api/admin/register`, {
    data: {
      email: adminEmail,
      password: 'password12345',
      name: 'E2E Admin',
    },
  });

  // Skip if admin registration endpoint doesn't exist (manual setup required)
  if (!createAdmin.ok() && createAdmin.status() === 404) {
    test.skip();
  }

  expect(createAdmin.ok()).toBeTruthy();

  // Navigate to login page
  await page.goto('/login');
  
  // Verify page loaded with proper heading
  await expect(page.getByRole('heading', { name: /Admin Login/i })).toBeVisible();

  // Fill form using label-based selectors (automation-friendly)
  await page.getByLabel(/Email/i).fill(adminEmail);
  await page.getByLabel(/Password/i).fill('password12345');
  
  // Submit using role-based selector
  await page.getByRole('button', { name: /Sign in/i }).click();

  // Should redirect to console
  await expect(page).toHaveURL(/\/console/);
  
  // Verify console page loaded
  await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
});

test('LIVE: admin login shows error message with role="alert"', async ({ page }) => {
  assertLiveWebEnv();

  await page.goto('/login');
  
  // Try to login with invalid credentials
  await page.getByLabel(/Email/i).fill('invalid@example.com');
  await page.getByLabel(/Password/i).fill('wrongpassword');
  await page.getByRole('button', { name: /Sign in/i }).click();

  // Error message should be visible and have role="alert" for accessibility
  const errorMessage = page.getByRole('alert');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/login|invalid|failed/i);
});

