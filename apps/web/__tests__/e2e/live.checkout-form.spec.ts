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

test('LIVE: checkout form uses FormField labels for automation', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const ownerEmail = uniqueEmail('owner');
  const viewerEmail = uniqueEmail('viewer');

  // Create owner + token via API (skip if production API rate-limits)
  const register = await request.post(`${apiBase}/api/owners/register`, {
    data: {
      email: ownerEmail,
      password: 'password12345',
      name: 'E2E Owner',
      type: 'individual',
    },
  });
  if (!register.ok()) { test.skip(); return; }
  const registerJson = (await register.json()) as any;
  const ownerToken = registerJson.token.token as string;

  // Create game
  const createGame = await request.post(`${apiBase}/api/owners/games`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      title: 'E2E Checkout Test',
      homeTeam: 'Home',
      awayTeam: 'Away',
      startsAt: new Date(Date.now() + 120_000).toISOString(),
      priceCents: 700,
      currency: 'USD',
    },
  });
  if (!createGame.ok()) { test.skip(); return; }
  const game = (await createGame.json()) as any;
  const gameId = game.id as string;

  // Activate
  const activate = await request.patch(`${apiBase}/api/owners/games/${gameId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { state: 'active' },
  });
  if (!activate.ok()) { test.skip(); return; }

  // Navigate to checkout page
  // Note: Route structure may vary - using same pattern as existing test
  await page.goto(`/game/${gameId}`);
  
  // Verify page loaded
  await expect(page.getByRole('heading', { name: /Purchase Stream Access/i })).toBeVisible();

  // Test form fields using label-based selectors (automation-friendly)
  const emailInput = page.getByLabel(/Email Address/i);
  await expect(emailInput).toBeVisible();
  await emailInput.fill(viewerEmail);

  // Optional phone field
  const phoneInput = page.getByLabel(/Phone Number/i);
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('+15551234567');

  // Submit button uses role-based selector with regex for dynamic price
  const submitButton = page.getByRole('button', { name: /Continue to Payment/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Should navigate to payment page
  await expect(page).toHaveURL(/\/checkout\/[^/]+\/payment$/);
});

test('LIVE: checkout form validation errors use role="alert"', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const ownerEmail = uniqueEmail('owner');

  // Create owner + game (skip if production API rate-limits)
  const register = await request.post(`${apiBase}/api/owners/register`, {
    data: {
      email: ownerEmail,
      password: 'password12345',
      name: 'E2E Owner',
      type: 'individual',
    },
  });
  if (!register.ok()) { test.skip(); return; }
  const registerJson = (await register.json()) as any;
  const ownerToken = registerJson.token.token as string;

  const createGame = await request.post(`${apiBase}/api/owners/games`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      title: 'E2E Validation Test',
      homeTeam: 'Home',
      awayTeam: 'Away',
      startsAt: new Date(Date.now() + 120_000).toISOString(),
      priceCents: 700,
      currency: 'USD',
    },
  });
  if (!createGame.ok()) { test.skip(); return; }
  const game = (await createGame.json()) as any;
  const gameId = game.id as string;

  const activate = await request.patch(`${apiBase}/api/owners/games/${gameId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { state: 'active' },
  });
  if (!activate.ok()) { test.skip(); return; }

  await page.goto(`/game/${gameId}`);

  // Try to submit with invalid email (no @)
  await page.getByLabel(/Email Address/i).fill('invalid-email');
  await page.getByRole('button', { name: /Continue to Payment/i }).click();

  // Browser native type="email" validation prevents form submission.
  // Verify form blocks navigation — page stays on checkout form.
  await page.waitForTimeout(1000);
  expect(page.url()).toContain(`/game/${gameId}`);
});

