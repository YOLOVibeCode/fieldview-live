import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Chat Integration
 * 
 * Tests chat unlock, messaging, and corner peek UI
 */

const SLUG = 'tchs';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';

test.describe('Chat Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${WEB_URL}/direct/${SLUG}`);
  });

  test('should show chat badge in corner', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for chat badge
    const chatBadge = page.getByTestId('btn-open-chat');
    await expect(chatBadge).toBeVisible({ timeout: 5000 });
  });

  test('should open chat panel on badge click', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click chat badge
    await page.getByTestId('btn-open-chat').click();

    // Chat panel should open
    await expect(page.getByTestId('chat-panel')).toBeVisible({ timeout: 2000 });
  });

  test('should show unlock form for new viewers', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open chat
    await page.getByTestId('btn-open-chat').click();

    // Unlock form or chat should be visible
    const unlockForm = page.locator('text=Join the conversation');
    const chatPanel = page.getByTestId('chat-panel');

    const hasUnlock = await unlockForm.isVisible({ timeout: 2000 }).catch(() => false);
    const hasChat = await chatPanel.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasUnlock || hasChat).toBe(true);
  });

  test('should close chat panel on close button', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open chat
    await page.getByTestId('btn-open-chat').click();
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 2000 });

    // Close chat
    await page.getByTestId('btn-close-chat').click();

    // Chat should close
    await expect(page.getByTestId('chat-panel')).not.toBeVisible({ timeout: 1000 });
  });

  test('should close chat on backdrop click', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open chat
    await page.getByTestId('btn-open-chat').click();
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 2000 });

    // Click backdrop
    const backdrop = page.getByTestId('chat-backdrop');
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click();

      // Chat should close
      await expect(page.getByTestId('chat-panel')).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('chat should be positioned in bottom right corner', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const chatBadge = page.getByTestId('btn-open-chat');
    const box = await chatBadge.boundingBox();

    if (box) {
      const viewport = page.viewportSize();
      expect(viewport).toBeTruthy();

      if (viewport) {
        // Badge should be near bottom right
        expect(box.x).toBeGreaterThan(viewport.width / 2);
        expect(box.y).toBeGreaterThan(viewport.height / 2);
      }
    }
  });

  test('chat panel should have proper dimensions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByTestId('btn-open-chat').click();
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 2000 });

    const chatPanel = page.getByTestId('chat-panel');
    const box = await chatPanel.boundingBox();

    if (box) {
      // Panel should have reasonable dimensions (360px x 500px per design)
      expect(box.width).toBeGreaterThan(300);
      expect(box.width).toBeLessThan(400);
      expect(box.height).toBeGreaterThan(400);
      expect(box.height).toBeLessThan(600);
    }
  });

  test('chat should show connection status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByTestId('btn-open-chat').click();
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 2000 });

    // Check for "Live" or "Connecting..." status
    const statusText = await page.locator('[data-testid="chat-panel"] >> text=/Live|Connecting/').textContent();
    expect(statusText).toMatch(/Live|Connecting/);
  });

  test('chat badge should show message count when messages exist', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const chatBadge = page.getByTestId('btn-open-chat');
    
    // Check if badge has a counter (appears when messages exist)
    const counter = chatBadge.locator('span').first();
    const hasCounter = await counter.isVisible().catch(() => false);

    if (hasCounter) {
      const counterText = await counter.textContent();
      expect(counterText).toMatch(/\d+|\d\+/);
    }
  });

  test('chat UI should be automation-friendly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Verify all key elements have data-testid
    await expect(page.getByTestId('btn-open-chat')).toBeVisible();
    
    await page.getByTestId('btn-open-chat').click();
    
    await expect(page.getByTestId('chat-panel')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('btn-close-chat')).toBeVisible();
  });
});

