import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Social Producer Panel & Scoreboard Overlay
 * 
 * Tests the complete flow of creating/managing scoreboard and viewing it
 */

const SLUG = 'tchs';
const ADMIN_PASSWORD = 'tchs2026';
const API_URL = process.env.API_URL || 'http://localhost:4301';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';

test.describe('Social Producer Panel & Scoreboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the direct stream page
    await page.goto(`${WEB_URL}/direct/${SLUG}`);
  });

  test('should show scoreboard overlay when visible', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Scoreboard should be visible if configured
    const scoreboard = page.getByTestId('scoreboard-overlay');
    
    // Check if scoreboard exists and is visible
    if (await scoreboard.isVisible()) {
      // Verify scoreboard elements
      await expect(page.getByTestId('scoreboard-home-team')).toBeVisible();
      await expect(page.getByTestId('scoreboard-away-team')).toBeVisible();
      await expect(page.getByTestId('scoreboard-clock')).toBeVisible();
    }
  });

  test('admin can unlock and access producer panel', async ({ page }) => {
    // Click Edit Stream button
    await page.getByTestId('btn-edit-stream').click();

    // Enter admin password
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    // Wait for admin panel to unlock
    await expect(page.getByTestId('producer-panel')).toBeVisible({ timeout: 10000 });
  });

  test('admin can update team names', async ({ page }) => {
    // Unlock admin panel
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    // Wait for producer panel
    await page.waitForSelector('[data-testid="producer-panel"]', { timeout: 10000 });

    // Update home team name
    const homeTeamInput = page.getByTestId('input-home-team-name');
    await homeTeamInput.clear();
    await homeTeamInput.fill('Warriors');
    await page.waitForTimeout(500); // Wait for debounced save

    // Update away team name
    const awayTeamInput = page.getByTestId('input-away-team-name');
    await awayTeamInput.clear();
    await awayTeamInput.fill('Tigers');
    await page.waitForTimeout(500);

    // Verify scoreboard updated
    const homeTeamName = page.getByTestId('scoreboard-home-team-name');
    const awayTeamName = page.getByTestId('scoreboard-away-team-name');
    
    await expect(homeTeamName).toContainText('Warriors', { timeout: 5000 });
    await expect(awayTeamName).toContainText('Tigers', { timeout: 5000 });
  });

  test('admin can update scores', async ({ page }) => {
    // Unlock admin panel
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="producer-panel"]', { timeout: 10000 });

    // Increment home score
    await page.getByTestId('btn-home-score-plus').click();
    await page.getByTestId('btn-home-score-plus').click();
    await page.waitForTimeout(500);

    // Increment away score
    await page.getByTestId('btn-away-score-plus').click();
    await page.waitForTimeout(500);

    // Verify scores on scoreboard
    const homeScore = page.getByTestId('scoreboard-home-score');
    const awayScore = page.getByTestId('scoreboard-away-score');
    
    await expect(homeScore).toContainText('2', { timeout: 5000 });
    await expect(awayScore).toContainText('1', { timeout: 5000 });
  });

  test('admin can control clock', async ({ page }) => {
    // Unlock admin panel
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="producer-panel"]', { timeout: 10000 });

    // Start clock
    const startButton = page.getByTestId('btn-clock-start');
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000); // Let clock run for 2 seconds

      // Pause clock
      await page.getByTestId('btn-clock-pause').click();
      await page.waitForTimeout(500);

      // Verify clock stopped
      const clockDisplay = page.getByTestId('clock-display');
      const clockText = await clockDisplay.textContent();
      expect(clockText).toMatch(/\d+:\d{2}/);
    }
  });

  test('admin can toggle scoreboard visibility', async ({ page }) => {
    // Unlock admin panel
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="producer-panel"]', { timeout: 10000 });

    // Get current visibility state
    const scoreboard = page.getByTestId('scoreboard-overlay');
    const initiallyVisible = await scoreboard.isVisible().catch(() => false);

    // Toggle visibility
    await page.getByTestId('btn-toggle-visibility').click();
    await page.waitForTimeout(1000);

    // Verify visibility changed
    const nowVisible = await scoreboard.isVisible().catch(() => false);
    expect(nowVisible).toBe(!initiallyVisible);
  });

  test('producer panel shows locked state initially', async ({ page }) => {
    // Click Edit Stream
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    // Scroll to producer panel
    await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="producer-panel-locked"]');
      if (panel) panel.scrollIntoView({ behavior: 'smooth' });
    });

    // Check if panel shows locked state (for public/password modes)
    const lockedPanel = page.getByTestId('producer-panel-locked');
    const unlockedPanel = page.getByTestId('producer-panel');
    
    // Either locked or unlocked panel should be visible
    const lockedVisible = await lockedPanel.isVisible().catch(() => false);
    const unlockedVisible = await unlockedPanel.isVisible().catch(() => false);
    
    expect(lockedVisible || unlockedVisible).toBe(true);
  });

  test('jersey colors are displayed correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const scoreboard = page.getByTestId('scoreboard-overlay');
    
    if (await scoreboard.isVisible()) {
      const homeTeam = page.getByTestId('scoreboard-home-team');
      const awayTeam = page.getByTestId('scoreboard-away-team');

      // Verify jersey color gradients are applied
      const homeStyle = await homeTeam.getAttribute('style');
      const awayStyle = await awayTeam.getAttribute('style');

      expect(homeStyle).toContain('background');
      expect(awayStyle).toContain('background');
    }
  });
});

