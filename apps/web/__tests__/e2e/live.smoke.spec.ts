import { test, expect } from '@playwright/test';

function assertLiveWebEnv() {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error('LIVE web tests require LIVE_TEST_MODE=1. Refusing to run.');
  }
  const base = process.env.PLAYWRIGHT_BASE_URL;
  if (!base) {
    throw new Error('Set PLAYWRIGHT_BASE_URL (e.g., http://localhost:3000) for LIVE web tests.');
  }
}

test('LIVE: home page loads', async ({ page }) => {
  assertLiveWebEnv();
  await page.goto('/');
  // Use getByRole for heading instead of getByText for better accessibility testing
  await expect(page.getByRole('heading', { name: /FieldView\.Live/i })).toBeVisible();
});


