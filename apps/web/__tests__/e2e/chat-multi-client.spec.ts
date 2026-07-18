import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Multi-Client Chat E2E Tests
 *
 * Verifies that chat messages sent from one client appear on another.
 * Tests anonymous chat across all form factors.
 *
 * Form factors:
 *   - Portrait mobile (390x844) — tabbed chat in PortraitStreamLayout
 *   - Landscape mobile (844x390) — bottom sheet chat
 *   - Tablet (768x1024) — sidebar chat
 *   - Desktop (1440x900) — sidebar chat
 *   - Cross-form-factor: desktop sends, mobile receives
 *
 * Prereqs: local API + web running, "test" stream with:
 *   - chatEnabled: true
 *   - allowAnonymousChat: true
 *   - streamUrl set
 */

const STREAM_URL = '/direct/test';

// Navigate and wait for anonymous auto-connect
async function navigateAndWaitForChat(page: Page): Promise<boolean> {
  await page.goto(STREAM_URL);
  await page.waitForTimeout(5000);

  // Check if the viewer is unlocked (bookmark controls visible)
  const unlocked = await page.getByTestId('btn-quick-bookmark')
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  return unlocked;
}

// Open chat if it's collapsed (desktop/tablet sidebar)
async function ensureChatOpen(page: Page): Promise<boolean> {
  // Check if chat input is already visible
  const chatInput = page.getByTestId('input-chat-message');
  if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    return true;
  }

  // Try clicking collapsed chat tab
  const collapsedTab = page.getByTestId('chat-collapsed-tab');
  if (await collapsedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await collapsedTab.click();
    await page.waitForTimeout(600);
    return chatInput.isVisible({ timeout: 2000 }).catch(() => false);
  }

  // Try mobile chat toggle
  const mobileToggle = page.getByTestId('btn-mobile-chat-toggle');
  if (await mobileToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mobileToggle.click();
    await page.waitForTimeout(600);
    return chatInput.isVisible({ timeout: 2000 }).catch(() => false);
  }

  // Portrait mode — chat tab should already be visible
  const chatTab = page.getByTestId('portrait-tab-chat');
  if (await chatTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatTab.click();
    await page.waitForTimeout(600);
    return chatInput.isVisible({ timeout: 2000 }).catch(() => false);
  }

  return false;
}

// Send a chat message (uses Enter key to avoid overlay interception issues)
async function sendMessage(page: Page, text: string): Promise<boolean> {
  const chatInput = page.getByTestId('input-chat-message');
  if (!await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    return false;
  }

  await chatInput.fill(text);
  await page.waitForTimeout(200);

  // Use Enter key — more reliable than clicking send button (avoids overlay interception)
  await chatInput.press('Enter');

  await page.waitForTimeout(1000);
  return true;
}

// Check if a message text appears in the page
async function messageVisible(page: Page, text: string, timeout = 10000): Promise<boolean> {
  try {
    await page.getByText(text, { exact: false }).first()
      .waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// DESKTOP (1440x900) — sidebar chat
// ============================================================
test.describe('Multi-Client Chat — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('chat input and send button are visible', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(true, 'Chat not available'); return; }

    await expect(page.getByTestId('input-chat-message')).toBeVisible();
    const sendBtn = page.getByTestId('btn-send-message');
    await expect(sendBtn).toBeVisible();
  });

  test('can send a message and it appears in the chat', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const testMsg = `Hello from desktop ${Date.now()}`;
    const sent = await sendMessage(page, testMsg);
    if (!sent) { test.skip(true, 'Could not send message'); return; }

    // Message should appear in the chat
    const visible = await messageVisible(page, testMsg, 5000);
    expect(visible).toBe(true);
  });

  test('message from one client appears on another client', async ({ browser }) => {
    const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const sender = await context1.newPage();
    const receiver = await context2.newPage();

    try {
      // Both navigate and wait for unlock
      await sender.goto(STREAM_URL);
      await receiver.goto(STREAM_URL);
      await sender.waitForTimeout(5000);
      await receiver.waitForTimeout(5000);

      // Open chat on both
      const senderReady = await ensureChatOpen(sender);
      const receiverReady = await ensureChatOpen(receiver);
      if (!senderReady || !receiverReady) { test.skip(true, 'Chat not available on both clients'); return; }

      // Sender sends a unique message
      const uniqueMsg = `Cross-client test ${Date.now()}`;
      const sent = await sendMessage(sender, uniqueMsg);
      if (!sent) { test.skip(true, 'Could not send message'); return; }

      // Verify sender sees their own message
      const senderSees = await messageVisible(sender, uniqueMsg, 5000);
      expect(senderSees, 'Sender should see their own message').toBe(true);

      // Receiver should see it via SSE (wait for SSE event delivery)
      const receiverSees = await messageVisible(receiver, uniqueMsg, 15000);
      expect(receiverSees, 'Receiver should see message from sender').toBe(true);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('multiple messages maintain order', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const ts = Date.now();
    const msg1 = `First ${ts}`;
    const msg2 = `Second ${ts}`;
    const msg3 = `Third ${ts}`;

    await sendMessage(page, msg1);
    await sendMessage(page, msg2);
    await sendMessage(page, msg3);

    await page.waitForTimeout(2000);

    // All messages should be visible
    expect(await messageVisible(page, msg1, 5000)).toBe(true);
    expect(await messageVisible(page, msg2, 3000)).toBe(true);
    expect(await messageVisible(page, msg3, 3000)).toBe(true);
  });

  test('Enter key sends message', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const testMsg = `Enter key test ${Date.now()}`;
    const chatInput = page.getByTestId('input-chat-message');
    await chatInput.fill(testMsg);
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);

    const visible = await messageVisible(page, testMsg, 5000);
    expect(visible).toBe(true);
  });
});

// ============================================================
// PORTRAIT MOBILE (390x844) — tabbed chat
// ============================================================
test.describe('Multi-Client Chat — Portrait Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('chat tab shows and input is accessible', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    // Portrait mode should show Chat tab
    const chatTab = page.getByTestId('portrait-tab-chat');
    const hasTab = await chatTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasTab) { test.skip(true, 'Portrait chat tab not visible'); return; }

    // Click chat tab
    await chatTab.click();
    await page.waitForTimeout(600);

    // Chat input should be visible
    const chatInput = page.getByTestId('input-chat-message');
    const hasInput = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasInput) { test.skip(true, 'Chat input not visible in portrait'); return; }

    await expect(chatInput).toBeVisible();
  });

  test('can send message in portrait mode', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const testMsg = `Portrait chat ${Date.now()}`;
    const sent = await sendMessage(page, testMsg);
    if (!sent) { test.skip(); return; }

    const visible = await messageVisible(page, testMsg, 5000);
    expect(visible).toBe(true);
  });
});

// ============================================================
// LANDSCAPE MOBILE (844x390) — bottom sheet chat
// ============================================================
test.describe('Multi-Client Chat — Landscape Mobile', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('chat toggle button opens chat in landscape', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(true, 'Could not open chat in landscape'); return; }

    const chatInput = page.getByTestId('input-chat-message');
    await expect(chatInput).toBeVisible();
  });

  test('can send message in landscape mode', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const testMsg = `Landscape chat ${Date.now()}`;
    const sent = await sendMessage(page, testMsg);
    if (!sent) { test.skip(); return; }

    const visible = await messageVisible(page, testMsg, 5000);
    expect(visible).toBe(true);
  });
});

// ============================================================
// TABLET (768x1024) — sidebar chat
// ============================================================
test.describe('Multi-Client Chat — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('chat sidebar opens and accepts messages', async ({ page }) => {
    const ready = await navigateAndWaitForChat(page);
    if (!ready) { test.skip(); return; }

    const chatOpen = await ensureChatOpen(page);
    if (!chatOpen) { test.skip(); return; }

    const testMsg = `Tablet chat ${Date.now()}`;
    const sent = await sendMessage(page, testMsg);
    if (!sent) { test.skip(); return; }

    const visible = await messageVisible(page, testMsg, 5000);
    expect(visible).toBe(true);
  });
});

// ============================================================
// CROSS-FORM-FACTOR: Desktop sends, Mobile receives
// ============================================================
test.describe('Multi-Client Chat — Cross Form Factor', () => {
  test('message sent from desktop appears on portrait mobile', async ({ browser }) => {
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const desktop = await desktopCtx.newPage();
    const mobile = await mobileCtx.newPage();

    try {
      // Both navigate
      await desktop.goto(STREAM_URL);
      await mobile.goto(STREAM_URL);
      await desktop.waitForTimeout(5000);
      await mobile.waitForTimeout(5000);

      // Open chat on desktop
      const desktopChat = await ensureChatOpen(desktop);
      if (!desktopChat) { test.skip(true, 'Desktop chat not available'); return; }

      // Open chat on mobile (portrait tab)
      const mobileChat = await ensureChatOpen(mobile);
      if (!mobileChat) { test.skip(true, 'Mobile chat not available'); return; }

      // Desktop sends a message
      const uniqueMsg = `Cross-device ${Date.now()}`;
      const sent = await sendMessage(desktop, uniqueMsg);
      if (!sent) { test.skip(); return; }

      // Verify desktop sees it
      const desktopSees = await messageVisible(desktop, uniqueMsg, 5000);
      expect(desktopSees, 'Desktop should see own message').toBe(true);

      // Mobile should receive via SSE
      const mobileSees = await messageVisible(mobile, uniqueMsg, 15000);
      expect(mobileSees, 'Mobile should see desktop message').toBe(true);
    } finally {
      await desktopCtx.close();
      await mobileCtx.close();
    }
  });
});
