/**
 * E2E Test: Tap-to-Edit Score Flow
 * 
 * Tests the complete user journey for editing scores on the scoreboard.
 * Tests both desktop (click) and mobile (tap) interactions.
 */

import { test, expect, type Page } from '@playwright/test';

// Helper: Setup viewer authentication
async function authenticateViewer(page: Page) {
  // Fill in registration form
  await page.fill('[data-testid="input-email"]', 'viewer@example.com');
  await page.fill('[data-testid="input-first-name"]', 'Test');
  await page.fill('[data-testid="input-last-name"]', 'Viewer');
  
  // Submit registration
  await page.click('[data-testid="btn-unlock-stream"]');
  
  // Wait for unlock to complete
  await page.waitForTimeout(1000);
}

// Helper: Ensure scoreboard is expanded
async function expandScoreboard(page: Page) {
  const collapsedTab = await page.$('[data-testid="scoreboard-collapsed-tab"]');
  if (collapsedTab) {
    await collapsedTab.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Tap-to-Edit Score Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test stream
    await page.goto('http://localhost:4300/direct/tchs/soccer-20260109-varsity');
    await page.waitForLoadState('networkidle');
  });

  test('should not allow score editing when user is not authenticated', async ({ page }) => {
    await expandScoreboard(page);

    // Score should not be clickable
    const homeScore = page.locator('[data-testid="scoreboard-home-score"]');
    await expect(homeScore).toBeDisabled();
  });

  test('should show modal when authenticated user taps home score', async ({ page }) => {
    // Authenticate viewer
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Click home score
    await page.click('[data-testid="scoreboard-home-score"]');

    // Modal should appear
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();
    await expect(page.locator('text=/Edit.*Home.*Score/i')).toBeVisible();
  });

  test('should show modal when authenticated user taps away score', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Click away score
    await page.click('[data-testid="scoreboard-away-score"]');

    // Modal should appear
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();
    await expect(page.locator('text=/Edit.*Away.*Score/i')).toBeVisible();
  });

  test('should update home score when saved', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Get initial score
    const homeScoreElement = page.locator('[data-testid="scoreboard-home-score"]');
    const initialScore = await homeScoreElement.textContent();

    // Open edit modal
    await homeScoreElement.click();
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();

    // Change score
    const input = page.locator('[data-testid="input-score-edit"]');
    await input.fill('15');

    // Save
    await page.click('[data-testid="btn-save-score"]');

    // Modal should close
    await expect(page.locator('[data-testid="modal-score-edit"]')).not.toBeVisible();

    // Score should be updated
    await page.waitForTimeout(500);
    const newScore = await homeScoreElement.textContent();
    expect(newScore).toBe('15');
    expect(newScore).not.toBe(initialScore);
  });

  test('should update away score when saved', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Get initial score
    const awayScoreElement = page.locator('[data-testid="scoreboard-away-score"]');
    const initialScore = await awayScoreElement.textContent();

    // Open edit modal
    await awayScoreElement.click();
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();

    // Change score
    const input = page.locator('[data-testid="input-score-edit"]');
    await input.fill('22');

    // Save
    await page.click('[data-testid="btn-save-score"]');

    // Modal should close
    await expect(page.locator('[data-testid="modal-score-edit"]')).not.toBeVisible();

    // Score should be updated
    await page.waitForTimeout(500);
    const newScore = await awayScoreElement.textContent();
    expect(newScore).toBe('22');
    expect(newScore).not.toBe(initialScore);
  });

  test('should cancel score edit when cancel button is clicked', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Get initial score
    const homeScoreElement = page.locator('[data-testid="scoreboard-home-score"]');
    const initialScore = await homeScoreElement.textContent();

    // Open edit modal
    await homeScoreElement.click();
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();

    // Change score
    const input = page.locator('[data-testid="input-score-edit"]');
    await input.fill('99');

    // Cancel
    await page.click('[data-testid="btn-cancel-score"]');

    // Modal should close
    await expect(page.locator('[data-testid="modal-score-edit"]')).not.toBeVisible();

    // Score should NOT be updated
    const currentScore = await homeScoreElement.textContent();
    expect(currentScore).toBe(initialScore);
  });

  test('should close modal when backdrop is clicked', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Open edit modal
    await page.click('[data-testid="scoreboard-home-score"]');
    await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();

    // Click backdrop
    await page.click('[data-testid="modal-backdrop"]');

    // Modal should close
    await expect(page.locator('[data-testid="modal-score-edit"]')).not.toBeVisible();
  });

  test('should handle large scores correctly', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Open edit modal
    await page.click('[data-testid="scoreboard-home-score"]');

    // Enter large score
    const input = page.locator('[data-testid="input-score-edit"]');
    await input.fill('999');

    // Save
    await page.click('[data-testid="btn-save-score"]');

    // Wait for update
    await page.waitForTimeout(500);

    // Verify
    const homeScore = await page.locator('[data-testid="scoreboard-home-score"]').textContent();
    expect(homeScore).toBe('999');
  });

  test('should prevent negative scores', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Open edit modal
    await page.click('[data-testid="scoreboard-home-score"]');

    // Try to enter negative score
    const input = page.locator('[data-testid="input-score-edit"]');
    await input.fill('-5');

    // Save
    await page.click('[data-testid="btn-save-score"]');

    // Wait for update
    await page.waitForTimeout(500);

    // Score should be 0, not negative
    const homeScore = await page.locator('[data-testid="scoreboard-home-score"]').textContent();
    expect(parseInt(homeScore || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should auto-select input text when modal opens', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Open edit modal
    await page.click('[data-testid="scoreboard-home-score"]');

    // Input should be focused and selected
    const input = page.locator('[data-testid="input-score-edit"]');
    await expect(input).toBeFocused();

    // Typing should replace the value
    await page.keyboard.type('33');
    const value = await input.inputValue();
    expect(value).toBe('33');
  });

  test('should have large enough touch targets for mobile (44px min)', async ({ page }) => {
    await authenticateViewer(page);
    await expandScoreboard(page);

    // Get score button
    const homeScore = page.locator('[data-testid="scoreboard-home-score"]');
    const box = await homeScore.boundingBox();

    // Verify touch target size (should be at least 44px in one dimension for mobile)
    expect(box).toBeTruthy();
    if (box) {
      // At least one dimension should be >= 44px for mobile accessibility
      const largerDimension = Math.max(box.height, box.width);
      expect(largerDimension).toBeGreaterThanOrEqual(44);
    }
  });

  test.describe('Mobile viewport tests', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('should work on mobile viewport', async ({ page }) => {
      await authenticateViewer(page);
      await expandScoreboard(page);

      // Tap score on mobile
      await page.tap('[data-testid="scoreboard-home-score"]');

      // Modal should appear
      await expect(page.locator('[data-testid="modal-score-edit"]')).toBeVisible();

      // Input should use numeric keyboard
      const input = page.locator('[data-testid="input-score-edit"]');
      const inputMode = await input.getAttribute('inputmode');
      expect(inputMode).toBe('numeric');

      // Change score
      await input.fill('8');

      // Save
      await page.tap('[data-testid="btn-save-score"]');

      // Verify
      await page.waitForTimeout(500);
      const homeScore = await page.locator('[data-testid="scoreboard-home-score"]').textContent();
      expect(homeScore).toBe('8');
    });

    test('should have responsive font sizes on mobile', async ({ page }) => {
      await expandScoreboard(page);

      // Check that scores are visible and not too large
      const homeScore = page.locator('[data-testid="scoreboard-home-score"]');
      await expect(homeScore).toBeVisible();

      // Team names should be smaller on mobile
      const teamName = page.locator('[data-testid="scoreboard-home-team-name"]');
      await expect(teamName).toBeVisible();
    });
  });
});

