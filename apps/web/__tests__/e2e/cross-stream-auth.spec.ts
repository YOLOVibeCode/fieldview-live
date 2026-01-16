/**
 * E2E Test: Cross-Stream Authentication
 * 
 * Tests the complete user journey for cross-stream authentication:
 * 1. User registers on one stream
 * 2. User navigates to another stream
 * 3. User is automatically authenticated
 * 4. User can immediately access chat and scoreboard
 * 
 * This test validates the global viewer authentication system.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4300';
const STREAM_1 = `${BASE_URL}/direct/tchs/soccer-20260113-varsity`;
const STREAM_2 = `${BASE_URL}/direct/tchs/soccer-20260113-jv`;

// Helper: Register viewer on a stream
async function registerViewer(
  page: Page,
  email: string,
  firstName: string,
  lastName: string
) {
  // Wait for registration modal or form to appear
  // Try v2 modal first
  const modalButton = await page.locator('[data-testid="btn-open-viewer-auth"]').first();
  if (await modalButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await modalButton.click();
    await page.waitForTimeout(500);
  }

  // Fill in registration form (v2 modal)
  const nameInput = page.locator('[data-testid="input-name"]').first();
  if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nameInput.fill(`${firstName} ${lastName}`);
    await page.locator('[data-testid="input-email"]').first().fill(email);
    await page.locator('[data-testid="btn-submit-viewer-register"]').first().click();
  } else {
    // Fallback to old registration form
    await page.locator('[data-testid="input-email"]').first().fill(email);
    await page.locator('[data-testid="input-first-name"]').first().fill(firstName);
    await page.locator('[data-testid="input-last-name"]').first().fill(lastName);
    await page.locator('[data-testid="btn-unlock-stream"]').first().click();
  }

  // Wait for registration to complete
  await page.waitForTimeout(2000);
}

// Helper: Check if viewer is authenticated (chat input is enabled)
async function isViewerAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check if chat input exists and is enabled
    const chatInput = page.locator('[data-testid="input-chat-message"]').first();
    
    if (!(await chatInput.isVisible({ timeout: 3000 }))) {
      return false;
    }

    const isDisabled = await chatInput.isDisabled();
    return !isDisabled;
  } catch {
    return false;
  }
}

// Helper: Expand chat panel if collapsed
async function expandChat(page: Page) {
  try {
    const collapsedTab = page.locator('[data-testid="chat-collapsed-tab"]').first();
    if (await collapsedTab.isVisible({ timeout: 1000 })) {
      await collapsedTab.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Chat might already be expanded or not exist
  }
}

// Helper: Expand scoreboard panel if collapsed
async function expandScoreboard(page: Page) {
  try {
    const collapsedTab = page.locator('[data-testid="scoreboard-collapsed-tab"]').first();
    if (await collapsedTab.isVisible({ timeout: 1000 })) {
      await collapsedTab.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Scoreboard might already be expanded or not exist
  }
}

test.describe('Cross-Stream Authentication', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and localStorage to start fresh
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should register on first stream and auto-authenticate on second stream', async ({ page }) => {
    // Step 1: Navigate to first stream
    console.log('[Test] Navigating to Stream 1:', STREAM_1);
    await page.goto(STREAM_1);
    await page.waitForLoadState('networkidle');

    // Step 2: Verify user is NOT authenticated initially
    await expandChat(page);
    let isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(false);
    console.log('[Test] Stream 1 - Initial auth status:', isAuth);

    // Step 3: Register viewer on Stream 1
    console.log('[Test] Registering viewer on Stream 1');
    await registerViewer(page, 'cross-stream-test@example.com', 'Cross', 'Stream');

    // Step 4: Verify user IS authenticated on Stream 1
    await page.waitForTimeout(2000); // Wait for registration to complete
    await expandChat(page);
    isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(true);
    console.log('[Test] Stream 1 - Auth status after registration:', isAuth);

    // Step 5: Navigate to second stream
    console.log('[Test] Navigating to Stream 2:', STREAM_2);
    await page.goto(STREAM_2);
    await page.waitForLoadState('networkidle');

    // Step 6: Wait for auto-registration to complete
    await page.waitForTimeout(3000); // Give time for auto-registration

    // Step 7: Verify user IS authenticated on Stream 2 (auto-registered!)
    await expandChat(page);
    isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(true);
    console.log('[Test] Stream 2 - Auth status after navigation:', isAuth);

    // Step 8: Verify chat input is enabled on Stream 2
    const chatInput = page.locator('[data-testid="input-chat-message"]').first();
    await expect(chatInput).toBeEnabled();
    console.log('[Test] Stream 2 - Chat input is enabled ✓');

    // Step 9: Verify scoreboard is accessible on Stream 2
    await expandScoreboard(page);
    const scoreboard = page.locator('[data-testid="scoreboard"]').first();
    await expect(scoreboard).toBeVisible({ timeout: 5000 });
    console.log('[Test] Stream 2 - Scoreboard is visible ✓');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Step 1: Register on Stream 1
    console.log('[Test] Registering on Stream 1');
    await page.goto(STREAM_1);
    await page.waitForLoadState('networkidle');
    await registerViewer(page, 'persistent-test@example.com', 'Persistent', 'User');
    await page.waitForTimeout(2000);

    // Step 2: Verify authenticated
    await expandChat(page);
    let isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(true);

    // Step 3: Reload page
    console.log('[Test] Reloading page');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 4: Verify still authenticated after reload
    await expandChat(page);
    isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(true);
    console.log('[Test] Still authenticated after reload ✓');
  });

  test('should sync authentication across multiple tabs', async ({ browser }) => {
    // Create two separate pages (tabs)
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    try {
      // Step 1: Navigate both tabs to different streams
      console.log('[Test] Opening two tabs');
      await page1.goto(STREAM_1);
      await page2.goto(STREAM_2);
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      // Step 2: Register on Tab 1
      console.log('[Test] Registering on Tab 1');
      await registerViewer(page1, 'multi-tab-test@example.com', 'Multi', 'Tab');
      await page1.waitForTimeout(2000);

      // Step 3: Verify Tab 1 is authenticated
      await expandChat(page1);
      let isAuth1 = await isViewerAuthenticated(page1);
      expect(isAuth1).toBe(true);
      console.log('[Test] Tab 1 authenticated ✓');

      // Step 4: Reload Tab 2 (to trigger auto-registration)
      console.log('[Test] Reloading Tab 2');
      await page2.reload();
      await page2.waitForLoadState('networkidle');
      await page2.waitForTimeout(3000); // Wait for auto-registration

      // Step 5: Verify Tab 2 is now authenticated
      await expandChat(page2);
      let isAuth2 = await isViewerAuthenticated(page2);
      expect(isAuth2).toBe(true);
      console.log('[Test] Tab 2 authenticated after reload ✓');

      // Step 6: Verify both tabs have enabled chat
      const chatInput1 = page1.locator('[data-testid="input-chat-message"]').first();
      const chatInput2 = page2.locator('[data-testid="input-chat-message"]').first();
      await expect(chatInput1).toBeEnabled();
      await expect(chatInput2).toBeEnabled();
      console.log('[Test] Both tabs have enabled chat ✓');
    } finally {
      await page1.close();
      await page2.close();
      await context.close();
    }
  });

  test('should send chat message on second stream without re-registering', async ({ page }) => {
    // Step 1: Register on Stream 1
    await page.goto(STREAM_1);
    await page.waitForLoadState('networkidle');
    await registerViewer(page, 'chat-test@example.com', 'Chat', 'Tester');
    await page.waitForTimeout(2000);

    // Step 2: Navigate to Stream 2
    await page.goto(STREAM_2);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for auto-registration

    // Step 3: Expand chat and send a message
    await expandChat(page);
    const chatInput = page.locator('[data-testid="input-chat-message"]').first();
    await expect(chatInput).toBeEnabled();

    const testMessage = 'Testing cross-stream chat! 🎉';
    await chatInput.fill(testMessage);

    const sendButton = page.locator('[data-testid="btn-send-message"]').first();
    await sendButton.click();

    // Step 4: Wait for message to be sent
    await page.waitForTimeout(2000);

    // Step 5: Verify input was cleared (message was sent)
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('');
    console.log('[Test] Chat message sent successfully on Stream 2 ✓');
  });

  test('should clear authentication when localStorage is cleared', async ({ page }) => {
    // Step 1: Register on a stream
    await page.goto(STREAM_1);
    await page.waitForLoadState('networkidle');
    await registerViewer(page, 'clear-test@example.com', 'Clear', 'Tester');
    await page.waitForTimeout(2000);

    // Step 2: Verify authenticated
    await expandChat(page);
    let isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(true);

    // Step 3: Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Step 4: Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 5: Verify NOT authenticated anymore
    await expandChat(page);
    isAuth = await isViewerAuthenticated(page);
    expect(isAuth).toBe(false);
    console.log('[Test] Authentication cleared successfully ✓');
  });
});

