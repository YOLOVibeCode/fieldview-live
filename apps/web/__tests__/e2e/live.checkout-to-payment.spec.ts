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

test('LIVE: checkout loads real game and proceeds to payment page (no mocks)', async ({ page, request }) => {
  assertLiveWebEnv();

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const ownerEmail = uniqueEmail('owner');
  const viewerEmail = uniqueEmail('viewer');

  // Create owner + token via API
  const register = await request.post(`${apiBase}/api/owners/register`, {
    data: {
      email: ownerEmail,
      password: 'password12345',
      name: 'E2E Owner',
      type: 'individual',
    },
  });
  expect(register.ok()).toBeTruthy();
  const registerJson = (await register.json()) as any;
  const ownerToken = registerJson.token.token as string;

  // Create game
  const createGame = await request.post(`${apiBase}/api/owners/games`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      title: 'E2E Game',
      homeTeam: 'Home',
      awayTeam: 'Away',
      startsAt: new Date(Date.now() + 120_000).toISOString(),
      priceCents: 700,
      currency: 'USD',
    },
  });
  expect(createGame.ok()).toBeTruthy();
  const game = (await createGame.json()) as any;
  const gameId = game.id as string;

  // Activate
  const activate = await request.patch(`${apiBase}/api/owners/games/${gameId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { state: 'active' },
  });
  expect(activate.ok()).toBeTruthy();

  // Go to checkout page in web app
  await page.goto(`/checkout/${gameId}`);
  await expect(page.getByText('Purchase Stream Access')).toBeVisible();

  // Submit email to create checkout -> should route to payment page
  await page.fill('input[type="email"]', viewerEmail);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/checkout\/[^/]+\/payment$/);
});


