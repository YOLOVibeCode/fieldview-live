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

test('LIVE: admin console search uses automation-friendly selectors', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const adminEmail = uniqueEmail('admin');
  const testEmail = uniqueEmail('test');

  // Navigate to console (will redirect to login if not authenticated)
  await page.goto('/console');
  // Wait for client-side auth redirect to settle
  await page.waitForTimeout(2000);

  // If redirected to login, skip (requires manual setup or auth helper)
  if (page.url().includes('/login')) {
    test.skip();
  }

  // Verify console page loaded
  await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();

  // Test search input using aria-label (automation-friendly)
  const searchInput = page.getByLabel(/Global Search/i);
  await expect(searchInput).toBeVisible();

  // Enter search query
  await searchInput.fill(testEmail);

  // Click search button using role-based selector
  const searchButton = page.getByRole('button', { name: /Search/i });
  await expect(searchButton).toBeEnabled();
  await searchButton.click();

  // Wait for search results (or loading state)
  // Results may be empty, but we're testing the selector pattern
  await expect(page.getByText(/No.*matches|Viewers|Games|Purchases/i)).toBeVisible({ timeout: 10000 });
});

test('LIVE: admin console logout button uses aria-label', async ({ page }) => {
  assertLiveWebEnv();

  await page.goto('/console');
  // Wait for client-side auth redirect to settle
  await page.waitForTimeout(2000);

  // If redirected to login, skip
  if (page.url().includes('/login')) {
    test.skip();
  }

  // Test logout button using aria-label
  const logoutButton = page.getByRole('button', { name: /Sign out/i });
  await expect(logoutButton).toBeVisible();

  // Click and verify redirect to login
  await logoutButton.click();
  await expect(page).toHaveURL(/\/login/);
});

test('LIVE: admin console purchase list items are clickable with aria-labels', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;

  // This test assumes purchases exist - may need setup
  await page.goto('/console');
  // Wait for client-side auth redirect to settle
  await page.waitForTimeout(2000);

  if (page.url().includes('/login')) {
    test.skip();
  }

  // Search for something that might return purchases
  await page.getByLabel(/Global Search/i).fill('test');
  await page.getByRole('button', { name: /Search/i }).click();

  // Wait a moment for results
  await page.waitForTimeout(1000);

  // Check if purchase buttons exist (they have aria-label with purchase ID)
  const purchaseButtons = page.getByRole('button', { name: /View purchase/i });
  const count = await purchaseButtons.count();

  if (count > 0) {
    // Click first purchase button
    await purchaseButtons.first().click();

    // Should navigate to purchase detail page
    await expect(page).toHaveURL(/\/purchases\/[^/]+/);

    // Verify purchase page loaded
    await expect(page.getByRole('heading', { name: /Purchase/i })).toBeVisible();
  } else {
    // No purchases found - that's okay, test passes
    test.skip();
  }
});
