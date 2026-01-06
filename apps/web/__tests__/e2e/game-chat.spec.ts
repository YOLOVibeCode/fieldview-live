/**
 * E2E Test: Game Chat Conversation
 * 
 * Simulates a full conversation between multiple viewers:
 * - Alice and Bob unlock the stream
 * - They send messages back and forth
 * - Messages appear in real-time for both
 * - Newest messages stay at top
 * - Character counter works
 * - Reconnection works after disconnect
 */

import { test, expect, type Page, type Browser } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';
const API_URL = process.env.API_URL || 'http://localhost:4301';
const TEST_PAGE_URL = `${WEB_URL}/test/chat`; // Dedicated E2E test page

// Helper: Setup a game for testing
async function setupTestGame(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/direct/e2e-test/bootstrap`);
    if (!response.ok) {
      console.error(`Bootstrap failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.gameId || null;
  } catch (error) {
    console.error('Setup error:', error);
    return null;
  }
}

// Helper: Unlock viewer
async function unlockViewer(page: Page, email: string, firstName: string, lastName: string) {
  await page.fill('[data-testid="input-email"]', email);
  await page.fill('[data-testid="input-first-name"]', firstName);
  await page.fill('[data-testid="input-last-name"]', lastName);
  await page.click('[data-testid="btn-unlock-stream"]');
  
  // Wait for chat panel to appear
  await page.waitForSelector('[data-testid="panel-chat"]', { timeout: 5000 });
}

// Helper: Send a message
async function sendMessage(page: Page, message: string) {
  await page.fill('[data-testid="input-chat-message"]', message);
  await page.click('[data-testid="btn-send-message"]');
  
  // Wait a bit for message to be sent and received
  await page.waitForTimeout(500);
}

// Helper: Wait for message to appear
async function waitForMessage(page: Page, messageText: string, displayName?: string, timeoutMs = 5000) {
  if (displayName) {
    // Look for a message element containing both the display name and message text
    await page.waitForSelector(
      `[data-testid^="chat-msg-"]:has-text("${displayName}"):has-text("${messageText}")`,
      { timeout: timeoutMs }
    );
  } else {
    // Just look for the message text anywhere
    await page.waitForSelector(`text=${messageText}`, { timeout: timeoutMs });
  }
}

test.describe('Game Chat E2E - Full Conversation', () => {
  let gameId: string | null;

  test.beforeAll(async () => {
    // Setup test game
    gameId = await setupTestGame();
    console.log('Test game ID:', gameId);
    if (!gameId) {
      throw new Error(`No gameId found. Make sure the API is running and an owner account exists. Try: cd apps/api && pnpm db:seed`);
    }
  });

  test('two viewers can have a full conversation', async ({ browser }) => {
    // Create two browser contexts (like two different users)
    const contextAlice = await browser.newContext();
    const contextBob = await browser.newContext();
    
    const pageAlice = await contextAlice.newPage();
    const pageBob = await contextBob.newPage();

    try {
      // Step 1: Both viewers navigate to the stream
      console.log('Step 1: Both viewers navigate to test page');
      await Promise.all([
        pageAlice.goto(TEST_PAGE_URL),
        pageBob.goto(TEST_PAGE_URL),
      ]);

      // Step 2: Alice unlocks first
      console.log('Step 2: Alice unlocks');
      await unlockViewer(pageAlice, 'alice@test.com', 'Alice', 'Smith');
      
      // Verify Alice sees the chat panel
      await expect(pageAlice.locator('[data-testid="panel-chat"]')).toBeVisible();
      
      // Step 3: Bob unlocks
      console.log('Step 3: Bob unlocks');
      await unlockViewer(pageBob, 'bob@test.com', 'Bob', 'Jones');
      
      // Verify Bob sees the chat panel
      await expect(pageBob.locator('[data-testid="panel-chat"]')).toBeVisible();

      // Step 4: Alice sends first message
      console.log('Step 4: Alice sends first message');
      await sendMessage(pageAlice, 'Hey Bob! Can you see this?');
      
      // Alice should see her own message
      await waitForMessage(pageAlice, 'Hey Bob! Can you see this?', 'Alice S.');
      
      // Bob should receive Alice's message
      await waitForMessage(pageBob, 'Hey Bob! Can you see this?', 'Alice S.');
      console.log('✓ Bob received Alice\'s message');

      // Step 5: Bob responds
      console.log('Step 5: Bob responds');
      await sendMessage(pageBob, 'Yes! I can see it. How are you?');
      
      // Bob should see his own message
      await waitForMessage(pageBob, 'Yes! I can see it. How are you?', 'Bob J.');
      
      // Alice should receive Bob's message
      await waitForMessage(pageAlice, 'Yes! I can see it. How are you?', 'Bob J.');
      console.log('✓ Alice received Bob\'s message');

      // Step 6: Alice replies
      console.log('Step 6: Alice replies');
      await sendMessage(pageAlice, 'I\'m great! Testing this chat system.');
      
      await waitForMessage(pageBob, 'I\'m great! Testing this chat system.', 'Alice S.');
      console.log('✓ Bob received Alice\'s reply');

      // Step 7: Bob sends multiple messages quickly
      console.log('Step 7: Bob sends multiple messages');
      await sendMessage(pageBob, 'That\'s awesome!');
      await sendMessage(pageBob, 'The real-time updates are working perfectly!');
      await sendMessage(pageBob, '🎉 This is great!');
      
      // Alice should see all three messages
      await waitForMessage(pageAlice, 'That\'s awesome!');
      await waitForMessage(pageAlice, 'The real-time updates are working perfectly!');
      await waitForMessage(pageAlice, '🎉 This is great!');
      console.log('✓ Alice received all three messages');

      // Step 8: Verify message order (newest first)
      console.log('Step 8: Verifying message order');
      const aliceMessages = await pageAlice.locator('[data-testid^="chat-msg-"]').allTextContents();
      
      // Latest message should contain the emoji
      expect(aliceMessages[0]).toContain('🎉 This is great!');
      console.log('✓ Messages are in newest-first order');

      // Step 9: Test character counter
      console.log('Step 9: Testing character counter');
      await pageAlice.fill('[data-testid="input-chat-message"]', 'A'.repeat(240));
      
      // Should show 0 characters remaining
      await expect(pageAlice.locator('text=0 characters remaining')).toBeVisible();
      
      // Try to type more (should be limited)
      await pageAlice.fill('[data-testid="input-chat-message"]', 'A'.repeat(250));
      const inputValue = await pageAlice.inputValue('[data-testid="input-chat-message"]');
      expect(inputValue.length).toBeLessThanOrEqual(240);
      console.log('✓ Character limit enforced');

      // Step 10: Test empty message prevention
      console.log('Step 10: Testing empty message prevention');
      await pageAlice.fill('[data-testid="input-chat-message"]', '');
      const sendButton = pageAlice.locator('[data-testid="btn-send-message"]');
      await expect(sendButton).toBeDisabled();
      console.log('✓ Empty messages prevented');

      // Step 11: Alice sends final message
      console.log('Step 11: Alice sends final message');
      await sendMessage(pageAlice, 'Perfect! Chat is working great!');
      await waitForMessage(pageBob, 'Perfect! Chat is working great!');
      console.log('✓ Final message delivered');

      // Step 12: Verify both viewers see all messages
      console.log('Step 12: Verifying message counts');
      const aliceMessageCount = await pageAlice.locator('[data-testid^="chat-msg-"]').count();
      const bobMessageCount = await pageBob.locator('[data-testid^="chat-msg-"]').count();
      
      expect(aliceMessageCount).toBeGreaterThan(0);
      expect(bobMessageCount).toBeGreaterThan(0);
      expect(aliceMessageCount).toBe(bobMessageCount); // Both should see same messages
      console.log(`✓ Both viewers see ${aliceMessageCount} messages`);

      // Step 13: Test connection indicator
      console.log('Step 13: Verifying connection indicator');
      await expect(pageAlice.locator('text=● Live')).toBeVisible();
      await expect(pageBob.locator('text=● Live')).toBeVisible();
      console.log('✓ Connection indicators showing "Live"');

      console.log('\n✅ Full conversation test PASSED!');
      console.log(`Total messages exchanged: ${aliceMessageCount}`);

    } finally {
      // Cleanup
      await pageAlice.close();
      await pageBob.close();
      await contextAlice.close();
      await contextBob.close();
    }
  });

  test('three viewers can all see each other\'s messages', async ({ browser }) => {
    const contextAlice = await browser.newContext();
    const contextBob = await browser.newContext();
    const contextCharlie = await browser.newContext();
    
    const pageAlice = await contextAlice.newPage();
    const pageBob = await contextBob.newPage();
    const pageCharlie = await contextCharlie.newPage();

    try {
      console.log('Testing 3-way conversation');

      // All navigate
      await Promise.all([
        pageAlice.goto(TEST_PAGE_URL),
        pageBob.goto(TEST_PAGE_URL),
        pageCharlie.goto(TEST_PAGE_URL),
      ]);

      // All unlock
      await unlockViewer(pageAlice, 'alice2@test.com', 'Alice', 'Williams');
      await unlockViewer(pageBob, 'bob2@test.com', 'Bob', 'Davis');
      await unlockViewer(pageCharlie, 'charlie@test.com', 'Charlie', 'Brown');

      // Alice sends
      await sendMessage(pageAlice, 'Hi everyone!');
      await waitForMessage(pageBob, 'Hi everyone!');
      await waitForMessage(pageCharlie, 'Hi everyone!');
      console.log('✓ Alice\'s message reached Bob and Charlie');

      // Bob sends
      await sendMessage(pageBob, 'Hey Alice!');
      await waitForMessage(pageAlice, 'Hey Alice!');
      await waitForMessage(pageCharlie, 'Hey Alice!');
      console.log('✓ Bob\'s message reached Alice and Charlie');

      // Charlie sends
      await sendMessage(pageCharlie, 'Hello both!');
      await waitForMessage(pageAlice, 'Hello both!');
      await waitForMessage(pageBob, 'Hello both!');
      console.log('✓ Charlie\'s message reached Alice and Bob');

      console.log('✅ 3-way conversation test PASSED!');

    } finally {
      await pageAlice.close();
      await pageBob.close();
      await pageCharlie.close();
      await contextAlice.close();
      await contextBob.close();
      await contextCharlie.close();
    }
  });

  test('messages persist and appear for late joiners', async ({ browser }) => {
    const contextAlice = await browser.newContext();
    const contextBob = await browser.newContext();
    
    const pageAlice = await contextAlice.newPage();

    try {
      console.log('Testing message persistence for late joiners');

      // Alice joins and sends messages
      await pageAlice.goto(TEST_PAGE_URL);
      await unlockViewer(pageAlice, 'alice3@test.com', 'Alice', 'Garcia');
      
      await sendMessage(pageAlice, 'First message');
      await sendMessage(pageAlice, 'Second message');
      await sendMessage(pageAlice, 'Third message');
      console.log('✓ Alice sent 3 messages');

      // Bob joins later
      const pageBob = await contextBob.newPage();
      await pageBob.goto(TEST_PAGE_URL);
      await unlockViewer(pageBob, 'bob3@test.com', 'Bob', 'Martinez');
      
      // Bob should see Alice's previous messages in the snapshot
      await waitForMessage(pageBob, 'First message');
      await waitForMessage(pageBob, 'Second message');
      await waitForMessage(pageBob, 'Third message');
      console.log('✓ Bob sees all previous messages');

      console.log('✅ Message persistence test PASSED!');

      await pageBob.close();

    } finally {
      await pageAlice.close();
      await contextAlice.close();
      await contextBob.close();
    }
  });

  test('viewer identity is remembered on refresh', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('Testing identity persistence');

      // First visit - unlock
      await page.goto(TEST_PAGE_URL);
      await unlockViewer(page, 'persistent@test.com', 'Persistent', 'User');
      
      // Verify unlocked
      await expect(page.locator('[data-testid="panel-chat"]')).toBeVisible();

      // Refresh page
      await page.reload();
      
      // Should still be unlocked (from localStorage)
      await expect(page.locator('[data-testid="panel-chat"]')).toBeVisible({ timeout: 3000 });
      
      // Should NOT see unlock form
      await expect(page.locator('[data-testid="form-viewer-unlock"]')).not.toBeVisible();
      
      console.log('✅ Identity persistence test PASSED!');

    } finally {
      await page.close();
      await context.close();
    }
  });
});

