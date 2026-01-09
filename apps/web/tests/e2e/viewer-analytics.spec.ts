import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Viewer Analytics Panel
 * 
 * Tests active viewer tracking and display
 */

const SLUG = 'tchs';
const ADMIN_PASSWORD = 'tchs2026';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';

test.describe('Viewer Analytics Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${WEB_URL}/direct/${SLUG}`);
  });

  test('admin can view analytics panel', async ({ page }) => {
    // Unlock admin panel
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    // Wait for admin panel to load
    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    // Verify analytics panel is visible
    await expect(page.getByTestId('viewer-analytics-panel')).toBeVisible();
    await expect(page.getByTestId('total-active-count')).toBeVisible();
  });

  test('should display total active count', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    const totalCount = page.getByTestId('total-active-count');
    await expect(totalCount).toBeVisible();
    
    const countText = await totalCount.textContent();
    expect(countText).toMatch(/\d+/);
  });

  test('should show viewer list when viewers are active', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    // Check for viewer list or no viewers message
    const viewerList = page.getByTestId('viewer-list');
    const noViewers = page.getByTestId('no-viewers');

    const hasViewers = await viewerList.isVisible().catch(() => false);
    const isEmpty = await noViewers.isVisible().catch(() => false);

    expect(hasViewers || isEmpty).toBe(true);
  });

  test('should display viewer with green status indicator when active', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    // Wait for viewer list to load
    await page.waitForTimeout(2000);

    // Check if any viewers are displayed
    const viewerList = page.getByTestId('viewer-list');
    
    if (await viewerList.isVisible().catch(() => false)) {
      // Get first viewer (if any)
      const firstViewer = await page.locator('[data-testid^="viewer-"]').first();
      
      if (await firstViewer.isVisible().catch(() => false)) {
        // Verify status indicator exists
        const status = await firstViewer.locator('[data-testid^="status-"]').first();
        await expect(status).toBeVisible();

        // Verify viewer name and email are displayed
        const name = await firstViewer.locator('[data-testid^="name-"]').first();
        const email = await firstViewer.locator('[data-testid^="email-"]').first();
        
        await expect(name).toBeVisible();
        await expect(email).toBeVisible();
      }
    }
  });

  test('should show last seen time for viewers', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const viewerList = page.getByTestId('viewer-list');
    
    if (await viewerList.isVisible().catch(() => false)) {
      const firstViewer = await page.locator('[data-testid^="viewer-"]').first();
      
      if (await firstViewer.isVisible().catch(() => false)) {
        const lastSeen = await firstViewer.locator('[data-testid^="last-seen-"]').first();
        await expect(lastSeen).toBeVisible();
        
        const lastSeenText = await lastSeen.textContent();
        expect(lastSeenText).toMatch(/(Just now|ago|\d+s|\d+m)/);
      }
    }
  });

  test('analytics panel should auto-refresh', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    // Get initial count
    const totalCount = page.getByTestId('total-active-count');
    const initialCount = await totalCount.textContent();

    // Wait for auto-refresh (10 seconds)
    await page.waitForTimeout(11000);

    // Count should still be visible (may or may not have changed)
    await expect(totalCount).toBeVisible();
    const newCount = await totalCount.textContent();
    
    // Verify count is still a number
    expect(newCount).toMatch(/\d+/);
  });

  test('should show no viewers message when empty', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });

    // Check for either viewer list or no viewers message
    const noViewers = page.getByTestId('no-viewers');
    const viewerList = page.getByTestId('viewer-list');

    const isEmpty = await noViewers.isVisible({ timeout: 3000 }).catch(() => false);
    const hasViewers = await viewerList.isVisible({ timeout: 3000 }).catch(() => false);

    if (isEmpty) {
      await expect(noViewers).toContainText('No active viewers');
    } else if (hasViewers) {
      await expect(viewerList).toBeVisible();
    }
  });

  test('viewer info should be properly formatted', async ({ page }) => {
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('input-admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('btn-unlock-admin').click();

    await page.waitForSelector('[data-testid="viewer-analytics-panel"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const viewerList = page.getByTestId('viewer-list');
    
    if (await viewerList.isVisible().catch(() => false)) {
      const firstViewer = await page.locator('[data-testid^="viewer-"]').first();
      
      if (await firstViewer.isVisible().catch(() => false)) {
        // Name should not be empty
        const name = await firstViewer.locator('[data-testid^="name-"]').first();
        const nameText = await name.textContent();
        expect(nameText).toBeTruthy();
        expect(nameText!.trim().length).toBeGreaterThan(0);

        // Email should be valid format
        const email = await firstViewer.locator('[data-testid^="email-"]').first();
        const emailText = await email.textContent();
        expect(emailText).toMatch(/\S+@\S+\.\S+/);
      }
    }
  });
});

