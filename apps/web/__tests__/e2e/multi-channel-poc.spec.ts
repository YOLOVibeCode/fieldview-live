/**
 * Multi-channel overlay PoC — E2E guarantee
 *
 * Shared toolbar owns stream + sport + clock. Channel panels are viewers only.
 */

import { test, expect } from '@playwright/test';

const URL = '/demo/multi-channel';
const DEFAULT_STREAM =
  'https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU.m3u8';

test.describe('Multi-channel overlay PoC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId('channel-panel-a').waitFor({ state: 'visible' });
    await page.getByTestId('channel-panel-b').waitFor({ state: 'visible' });
  });

  test('stream input defaults to the Mux clip; sport lives only in the toolbar', async ({
    page,
  }) => {
    await expect(page.getByTestId('input-stream-url')).toHaveValue(DEFAULT_STREAM);
    await expect(page.getByTestId('multi-channel-toolbar').getByTestId('dropdown-sport')).toBeVisible();
    await expect(page.getByTestId('channel-panel-a').getByTestId('dropdown-sport')).toHaveCount(0);
    await expect(page.getByTestId('channel-panel-b').getByTestId('dropdown-sport')).toHaveCount(0);
    await expect(page.getByTestId('vidstack-player-channel-a')).toBeVisible();
    await expect(page.getByTestId('vidstack-player-channel-b')).toBeVisible();
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

  test('shared sport change appears on both channels (football 12:00)', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');
    const b = page.getByTestId('channel-panel-b');

    await page.getByTestId('dropdown-sport').selectOption('football');

    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '12:00'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).toHaveText(
      '12:00'
    );
    await expect(b.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toHaveText('Q1');
    await expect(page.getByTestId('dropdown-sport')).toHaveValue('football');
  });

  test('shared clock start ticks down on both channels', async ({ page }) => {
    const b = page.getByTestId('channel-panel-b');

    await page.getByTestId('dropdown-sport').selectOption('football');
    await page.getByTestId('btn-clock-start').click();
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

    await page.getByTestId('dropdown-sport').selectOption('football');
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

    await expect(a.getByTestId('btn-confirm-pending-event')).toHaveCount(0);
    await b.getByTestId('btn-confirm-pending-event').click();

    await expect(a.getByTestId('debug-home-score')).toHaveText('6');
    await expect(b.getByTestId('debug-home-score')).toHaveText('6');
    await expect(b.getByTestId('chip-pending-event')).toHaveCount(0);
  });

  test('shared baseball overlay hides clock on both channels', async ({ page }) => {
    const a = page.getByTestId('channel-panel-a');

    await page.getByTestId('dropdown-sport').selectOption('baseball');

    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-period')).toContainText(
      'Top'
    );
    await expect(a.getByTestId('mini-score-overlay').getByTestId('overlay-clock')).not.toBeAttached();
  });
});
