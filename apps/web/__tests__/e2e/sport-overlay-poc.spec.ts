/**
 * Sport Overlay PoC — E2E guarantee
 *
 * Exercises /demo/sport-overlay (no API required).
 * All assertions depend only on the catalog and local clock state.
 */

import { test, expect } from '@playwright/test';

const URL = '/demo/sport-overlay';

test.describe('Sport Overlay PoC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId('mini-score-overlay').waitFor({ state: 'visible' });
  });

  // ── Soccer (default) ──────────────────────────────────────────────────────

  test('soccer default: period = 1st Half, clock = 00:00', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');
    await expect(overlay.getByTestId('overlay-period')).toHaveText('1st Half');
    await expect(overlay.getByTestId('overlay-clock')).toHaveText('00:00');
  });

  test('soccer: clock counts up after start', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');

    await page.getByTestId('btn-clock-start').click();
    await page.waitForTimeout(1500);

    const clockText = await overlay.getByTestId('overlay-clock').textContent();
    expect(clockText).not.toBe('00:00');
    expect(clockText).toMatch(/^0[01]:\d{2}$/);
  });

  // ── Football ─────────────────────────────────────────────────────────────

  test('football reset: clock = 12:00, period = Q1', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');

    await page.getByTestId('dropdown-sport').selectOption('football');

    await expect(overlay.getByTestId('overlay-period')).toHaveText('Q1');
    await expect(overlay.getByTestId('overlay-clock')).toHaveText('12:00');
  });

  test('football: clock counts down after start', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');

    await page.getByTestId('dropdown-sport').selectOption('football');
    await expect(overlay.getByTestId('overlay-clock')).toHaveText('12:00');

    await page.getByTestId('btn-clock-start').click();
    await page.waitForTimeout(1500);

    const clockText = await overlay.getByTestId('overlay-clock').textContent();
    expect(clockText).not.toBe('12:00');
    expect(clockText).toMatch(/^11:\d{2}$/);
  });

  // ── Baseball ─────────────────────────────────────────────────────────────

  test('baseball: period contains Top, clock not in DOM', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');

    await page.getByTestId('dropdown-sport').selectOption('baseball');

    await expect(overlay.getByTestId('overlay-period')).toBeVisible();
    const periodText = await overlay.getByTestId('overlay-period').textContent();
    expect(periodText).toMatch(/^Top/);

    // overlay-clock must NOT be in the DOM inside the overlay
    await expect(overlay.getByTestId('overlay-clock')).not.toBeAttached();
  });

  // ── Crowdsource: tap opens ReportEventSheet ───────────────────────────────

  test('football + tap home team opens ReportEventSheet with Touchdown', async ({
    page,
  }) => {
    await page.getByTestId('dropdown-sport').selectOption('football');

    // Tap the home team button within the overlay
    const overlay = page.getByTestId('mini-score-overlay');
    await overlay.getByTestId('btn-overlay-team-home').click();

    await expect(page.getByTestId('modal-report-event')).toBeVisible();
    await expect(page.getByTestId('btn-event-type-touchdown')).toBeVisible();
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  test('soccer: reset after start returns to 00:00', async ({ page }) => {
    const overlay = page.getByTestId('mini-score-overlay');

    await page.getByTestId('btn-clock-start').click();
    await page.waitForTimeout(1000);

    await page.getByTestId('btn-clock-reset').click();
    await expect(overlay.getByTestId('overlay-clock')).toHaveText('00:00');
  });
});
