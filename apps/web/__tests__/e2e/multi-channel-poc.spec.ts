/**
 * Multi-channel overlay PoC — E2E guarantee
 *
 * Two viewer instances share one stream. A change on Channel A must appear on B
 * (and the reverse path for confirm).
 */

import { test, expect } from '@playwright/test';

const URL = '/demo/multi-channel';

test.describe('Multi-channel overlay PoC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId('channel-panel-a').waitFor({ state: 'visible' });
    await page.getByTestId('channel-panel-b').waitFor({ state: 'visible' });
  });

  test('both channels start on soccer 00:00', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toHaveText(
      '1st Half'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toHaveText(
      '1st Half'
    );
    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '00:00'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '00:00'
    );
  });

  test('sport change on A appears on B (football 12:00)', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await a.getByTestId('dropdown-sport').selectOption('football');

    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '12:00'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '12:00'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toHaveText('Q1');
    await expect(b.getByTestId('dropdown-sport')).toHaveValue('football');
  });

  test('clock start on A ticks down on B', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await a.getByTestId('dropdown-sport').selectOption('football');
    await a.getByTestId('btn-clock-start').click();
    await page.waitForTimeout(1500);

    const bClock = await b.getByTestId('mini-score-overlay').getByTestId('overlay-clock').textContent();
    expect(bClock).not.toBe('12:00');
    expect(bClock).toMatch(/^11:\d{2}$/);
  });

  test('report on A shows pending chip on B; confirm on B updates both scores', async ({
    page,
  }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await a.getByTestId('dropdown-sport').selectOption('football');
    await a.getByTestId('mini-score-overlay').getByTestId('btn-overlay-team-home').click();

    await expect(page.getByTestId('modal-report-event')).toBeVisible();
    await page.getByTestId('btn-event-type-touchdown').click();
    const skip = page.getByTestId('btn-skip-detail');
    if (await skip.isVisible()) {
      await skip.click();
    }

    await expect(b.getByTestId('chip-pending-event')).toBeVisible();
    await expect(a.getByTestId('chip-pending-event')).toBeVisible();
    await expect(a.getByTestId('debug-home-score')).toHaveText('0');
    await expect(b.getByTestId('debug-home-score')).toHaveText('0');

    // Reporter cannot confirm; the other channel can
    await expect(a.getByTestId('btn-confirm-pending-event')).toHaveCount(0);
    await b.getByTestId('btn-confirm-pending-event').click();

    await expect(a.getByTestId('debug-home-score')).toHaveText('6');
    await expect(b.getByTestId('debug-home-score')).toHaveText('6');
    await expect(b.getByTestId('chip-pending-event')).toHaveCount(0);
  });

  test('sport change on B appears on A', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await b.getByTestId('dropdown-sport').selectOption('baseball');

    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toContainText(
      'Top'
    );
    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).not.toBeAttached();
  });
});
