import { test, expect, type Page } from '@playwright/test';

/**
 * Welcome Banner E2E Tests
 *
 * Verifies the admin welcome message lifecycle on production:
 * 1. Admin sets message → viewer sees banner
 * 2. Viewer dismisses → stays dismissed on reload
 * 3. Admin changes message → banner reappears
 * 4. Admin clears message → no banner
 */

const PROD_URL = 'https://fieldview.live/direct/tchs';
const PROD_API = 'https://api.fieldview.live';
const ADMIN_PASSWORD = 'tchs2026';

async function getAdminToken(): Promise<string> {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/unlock-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok) throw new Error(`Admin unlock failed: ${resp.status}`);
  const data = await resp.json();
  return data.token;
}

async function setWelcomeMessage(token: string, message: string | null): Promise<void> {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ welcomeMessage: message }),
  });
  if (!resp.ok) throw new Error(`Settings update failed: ${resp.status}`);
}

test.describe('Welcome Banner', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test.afterAll(async () => {
    // Clean up: clear welcome message
    await setWelcomeMessage(adminToken, null);
  });

  test('admin sets message, viewer sees banner', async ({ page }) => {
    const msg = `E2E test welcome ${Date.now()}`;
    await setWelcomeMessage(adminToken, msg);

    // Clear localStorage to simulate fresh visitor
    await page.goto(PROD_URL);
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('welcome-dismissed-'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForTimeout(2000);

    const banner = page.getByTestId('welcome-message-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(msg);
  });

  test('viewer dismisses, stays dismissed on reload', async ({ page }) => {
    const msg = `E2E dismiss test ${Date.now()}`;
    await setWelcomeMessage(adminToken, msg);

    await page.goto(PROD_URL);
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('welcome-dismissed-'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Verify banner is visible
    const banner = page.getByTestId('welcome-message-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Dismiss it
    await page.getByTestId('btn-dismiss-welcome').click();
    await expect(banner).not.toBeVisible();

    // Reload and verify still dismissed
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('welcome-message-banner')).not.toBeVisible();
  });

  test('admin changes message, banner reappears', async ({ page }) => {
    const msg1 = `First message ${Date.now()}`;
    await setWelcomeMessage(adminToken, msg1);

    await page.goto(PROD_URL);
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('welcome-dismissed-'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Dismiss first message
    await page.getByTestId('btn-dismiss-welcome').click();
    await expect(page.getByTestId('welcome-message-banner')).not.toBeVisible();

    // Admin changes message
    const msg2 = `Updated message ${Date.now()}`;
    await setWelcomeMessage(adminToken, msg2);

    // Reload — new message should appear
    await page.reload();
    await page.waitForTimeout(2000);

    const banner = page.getByTestId('welcome-message-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(msg2);
  });

  test('admin clears message, no banner', async ({ page }) => {
    await setWelcomeMessage(adminToken, null);

    await page.goto(PROD_URL);
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('welcome-dismissed-'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('welcome-message-banner')).not.toBeVisible();
  });
});
