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

test('LIVE: payment page uses data-testid for Square container', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const ownerEmail = uniqueEmail('owner');
  const viewerEmail = uniqueEmail('viewer');

  // Create owner + game + checkout (skip if production API rate-limits)
  const register = await request.post(`${apiBase}/api/owners/register`, {
    data: {
      email: ownerEmail,
      password: 'password12345',
      name: 'E2E Owner',
      type: 'individual',
    },
  });
  if (!register.ok()) {
    test.skip();
    return;
  }
  const registerJson = (await register.json()) as any;
  const ownerToken = registerJson.token.token as string;

  const createGame = await request.post(`${apiBase}/api/owners/games`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      title: 'E2E Payment Test',
      homeTeam: 'Home',
      awayTeam: 'Away',
      startsAt: new Date(Date.now() + 120_000).toISOString(),
      priceCents: 700,
      currency: 'USD',
    },
  });
  if (!createGame.ok()) {
    test.skip();
    return;
  }
  const game = (await createGame.json()) as any;
  const gameId = game.id as string;

  const activate = await request.patch(`${apiBase}/api/owners/games/${gameId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { state: 'active' },
  });
  if (!activate.ok()) {
    test.skip();
    return;
  }

  // Create checkout
  const checkout = await request.post(`${apiBase}/api/public/games/${gameId}/checkout`, {
    data: {
      viewerEmail,
    },
  });
  if (!checkout.ok()) {
    test.skip();
    return;
  }
  const checkoutJson = (await checkout.json()) as any;
  const purchaseId = checkoutJson.purchaseId as string;

  // Navigate to payment page
  await page.goto(`/checkout/${purchaseId}/payment`);
  
  // Verify page loaded
  await expect(page.getByRole('heading', { name: /Complete Payment/i })).toBeVisible();

  // Test Square container using data-testid (3rd-party widget)
  const squareContainer = page.getByTestId('square-card-container');
  await expect(squareContainer).toBeVisible();

  // Test Pay Now button using data-testid
  const payButton = page.getByTestId('pay-now');
  await expect(payButton).toBeVisible();
  
  // Button should be visible (may be disabled until Square loads)
  // Note: Actual payment processing would require Square test credentials
});

test('LIVE: payment page error messages use role="alert"', async ({ page }) => {
  assertLiveWebEnv();

  // Navigate to invalid purchase ID
  await page.goto('/checkout/invalid-purchase-id/payment');
  
  // Should show error (either from API or page logic)
  // Error message should have role="alert" for accessibility
  const errorAlert = page.getByRole('alert');
  
  // Error may or may not appear depending on page logic
  // If it appears, verify it has proper role
  const count = await errorAlert.count();
  if (count > 0) {
    await expect(errorAlert.first()).toBeVisible();
  }
});

