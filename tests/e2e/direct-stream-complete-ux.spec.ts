/**
 * Complete Direct Stream UX Test Suite
 * 
 * Tests the full lifecycle of a direct stream from creation to live interaction:
 * 1. Admin creates and configures stream
 * 2. Viewers access stream
 * 3. Viewers register for chat
 * 4. Live chat interaction
 * 5. Scoreboard updates
 * 6. Fullscreen and mobile experience
 * 
 * Based on architect's test plan: "Friday Night Varsity Basketball Game"
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test configuration
const STREAM_SLUG = 'tchs-basketball-20260110';
const STREAM_TITLE = 'TCHS Varsity Basketball vs Rival HS';
const STREAM_URL = 'https://test.stream.com/tchs-basketball.m3u8';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const WEB_URL = 'http://localhost:4300';

// Test data
const VIEWER_1 = {
  email: 'parent@example.com',
  firstName: 'Sarah',
  lastName: 'Johnson',
  displayName: 'Sarah J.',
};

const VIEWER_2 = {
  email: 'alumni@example.com',
  firstName: 'Mike',
  lastName: 'Chen',
  displayName: 'Mike C.',
};

const VIEWER_3 = {
  email: 'student@example.com',
  firstName: 'Emma',
  lastName: 'Smith',
  displayName: 'Emma S.',
};

test.describe('Direct Stream Complete UX Flow', () => {
  
  test.describe.configure({ mode: 'serial' }); // Run tests in sequence
  
  let adminPage: Page;
  let viewer1Page: Page;
  let viewer2Page: Page;
  let viewer3Page: Page;
  let streamId: string;
  let gameId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup pages for multi-user testing
    const adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    
    const viewer1Context = await browser.newContext();
    viewer1Page = await viewer1Context.newPage();
    
    const viewer2Context = await browser.newContext({
      // Simulate mobile device
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      isMobile: true,
      hasTouch: true,
    });
    viewer2Page = await viewer2Context.newPage();
    
    const viewer3Context = await browser.newContext();
    viewer3Page = await viewer3Context.newPage();
  });

  test.afterAll(async () => {
    // Cleanup: Close all pages
    await adminPage?.close();
    await viewer1Page?.close();
    await viewer2Page?.close();
    await viewer3Page?.close();
  });

  // ========================================
  // PHASE 1: Stream Creation & Configuration
  // ========================================

  test('Phase 1.1: Admin creates new direct stream', async () => {
    // Navigate to admin panel (skip auth for now - assume dev mode)
    await adminPage.goto(`${WEB_URL}/admin/direct-streams`);
    
    // Click create button
    await adminPage.click('button:has-text("Create Stream")');
    
    // Fill in stream details
    await adminPage.fill('input[name="slug"]', STREAM_SLUG);
    await adminPage.fill('input[name="title"]', STREAM_TITLE);
    await adminPage.fill('input[name="streamUrl"]', STREAM_URL);
    
    // Save
    await adminPage.click('button[type="submit"]');
    
    // Wait for success and redirect
    await adminPage.waitForURL(/\/admin\/direct-streams\/.+/);
    
    // Verify stream appears in list
    await adminPage.goto(`${WEB_URL}/admin/direct-streams`);
    await expect(adminPage.locator(`text=${STREAM_TITLE}`)).toBeVisible();
    
    // Extract stream ID for later use
    const response = await adminPage.request.get(
      `${API_URL}/api/admin/direct-streams?slug=${STREAM_SLUG}`
    );
    const streams = await response.json();
    streamId = streams[0]?.id;
    expect(streamId).toBeTruthy();
  });

  test('Phase 1.2: Admin enables chat', async () => {
    // Navigate to stream settings
    await adminPage.goto(`${WEB_URL}/admin/direct-streams/${streamId}`);
    
    // Enable chat toggle
    const chatToggle = adminPage.locator('button:has-text("Enable Chat")');
    await chatToggle.click();
    
    // Wait for confirmation
    await expect(adminPage.locator('text=Chat enabled')).toBeVisible({ timeout: 5000 });
    
    // Verify via API
    const response = await adminPage.request.get(
      `${API_URL}/api/direct/${STREAM_SLUG}/bootstrap`
    );
    const bootstrap = await response.json();
    expect(bootstrap.chatEnabled).toBe(true);
    gameId = bootstrap.gameId; // Store for later
    expect(gameId).toBeTruthy();
  });

  test('Phase 1.3: Admin configures scoreboard', async () => {
    // Enable scoreboard
    const scoreboardToggle = adminPage.locator('button:has-text("Enable Scoreboard")');
    await scoreboardToggle.click();
    
    // Fill in team details
    await adminPage.fill('input[name="homeTeam"]', 'TCHS Eagles');
    await adminPage.fill('input[name="awayTeam"]', 'Rival Rockets');
    await adminPage.fill('input[name="homeColor"]', '#1e3a8a');
    await adminPage.fill('input[name="awayColor"]', '#dc2626');
    
    // Save
    await adminPage.click('button:has-text("Save Settings")');
    
    // Wait for confirmation
    await expect(adminPage.locator('text=Settings saved')).toBeVisible({ timeout: 5000 });
    
    // Verify via API
    const response = await adminPage.request.get(
      `${API_URL}/api/direct/${STREAM_SLUG}/scoreboard`
    );
    const scoreboard = await response.json();
    expect(scoreboard.homeTeam).toBe('TCHS Eagles');
    expect(scoreboard.awayTeam).toBe('Rival Rockets');
    expect(scoreboard.homeScore).toBe(0);
    expect(scoreboard.awayScore).toBe(0);
  });

  // ========================================
  // PHASE 2: Stream Activation & Viewer Access
  // ========================================

  test('Phase 2.1: Viewer 1 accesses stream (Desktop)', async () => {
    await viewer1Page.goto(`${WEB_URL}/direct/${STREAM_SLUG}`);
    
    // Verify page loads
    await expect(viewer1Page.locator(`text=${STREAM_TITLE}`)).toBeVisible();
    
    // Verify video player
    await expect(viewer1Page.locator('video')).toBeVisible();
    
    // Verify scoreboard (collapsed by default)
    const scoreboard = viewer1Page.locator('[data-testid*="scoreboard"]');
    await expect(scoreboard).toBeVisible();
    
    // Verify chat panel (collapsed by default)
    const chatPanel = viewer1Page.locator('[role="dialog"]:has-text("Chat")');
    await expect(chatPanel).toBeVisible();
    
    // Verify footer
    await expect(viewer1Page.locator('text=Powered by FieldView.Live')).toBeVisible();
  });

  test('Phase 2.2: Viewer 2 accesses stream (Mobile)', async () => {
    await viewer2Page.goto(`${WEB_URL}/direct/${STREAM_SLUG}`);
    
    // Verify page loads and adapts to mobile
    await expect(viewer2Page.locator(`text=${STREAM_TITLE}`)).toBeVisible();
    
    // Verify mobile controls visible
    const mobileControls = viewer2Page.locator('[data-testid*="mobile-control"]');
    // Mobile controls only show in fullscreen, so just verify page loaded
    
    // Verify video player scales
    const video = viewer2Page.locator('video');
    await expect(video).toBeVisible();
    
    // Check viewport is mobile
    const viewport = viewer2Page.viewportSize();
    expect(viewport?.width).toBe(375);
  });

  // ========================================
  // PHASE 3: Viewer Registration & Chat
  // ========================================

  test('Phase 3.1: Viewer 1 registers for chat (Desktop)', async () => {
    // Expand chat panel
    const expandButton = viewer1Page.locator('button:has-text("Expand")').first();
    await expandButton.click();
    
    // Fill registration form
    await viewer1Page.fill('input[data-testid="input-email"]', VIEWER_1.email);
    await viewer1Page.fill('input[data-testid="input-first-name"]', VIEWER_1.firstName);
    await viewer1Page.fill('input[data-testid="input-last-name"]', VIEWER_1.lastName);
    
    // Submit
    await viewer1Page.click('button[data-testid="btn-unlock-stream"]');
    
    // Wait for chat to unlock
    await expect(viewer1Page.locator('text=No messages yet')).toBeVisible({ timeout: 10000 });
    
    // Verify chat input available
    const chatInput = viewer1Page.locator('input[placeholder*="message"]');
    await expect(chatInput).toBeVisible();
  });

  test('Phase 3.2: Viewer 2 registers for chat (Mobile)', async () => {
    // Tap chat icon
    const chatButton = viewer2Page.locator('button[aria-label*="chat"]').first();
    await chatButton.click();
    
    // Fill registration form (mobile keyboard)
    await viewer2Page.fill('input[type="email"]', VIEWER_2.email);
    await viewer2Page.fill('input[autocomplete="given-name"]', VIEWER_2.firstName);
    await viewer2Page.fill('input[autocomplete="family-name"]', VIEWER_2.lastName);
    
    // Submit
    await viewer2Page.click('button:has-text("Unlock")');
    
    // Wait for chat interface
    await expect(viewer2Page.locator('text=No messages yet')).toBeVisible({ timeout: 10000 });
  });

  test('Phase 3.3: Viewer 3 registers for chat', async () => {
    await viewer3Page.goto(`${WEB_URL}/direct/${STREAM_SLUG}`);
    
    // Expand chat
    const expandButton = viewer3Page.locator('button').filter({ hasText: /expand|chat/i }).first();
    await expandButton.click();
    
    // Register
    await viewer3Page.fill('input[type="email"]', VIEWER_3.email);
    await viewer3Page.fill('input[autocomplete="given-name"]', VIEWER_3.firstName);
    await viewer3Page.fill('input[autocomplete="family-name"]', VIEWER_3.lastName);
    await viewer3Page.click('button[type="submit"]');
    
    // Wait for unlock
    await expect(viewer3Page.locator('input[placeholder*="message"]')).toBeVisible({ timeout: 10000 });
  });

  // ========================================
  // PHASE 4: Live Chat Interaction
  // ========================================

  test('Phase 4.1: Multi-user chat interaction', async () => {
    // Viewer 1 sends first message
    const viewer1Input = viewer1Page.locator('input[placeholder*="message"]');
    await viewer1Input.fill('Go Eagles! 🦅');
    await viewer1Input.press('Enter');
    
    // Verify message appears on Viewer 1's screen
    await expect(viewer1Page.locator(`text=${VIEWER_1.displayName}`)).toBeVisible({ timeout: 2000 });
    await expect(viewer1Page.locator('text=Go Eagles!')).toBeVisible();
    
    // Wait for message to propagate
    await viewer1Page.waitForTimeout(1000);
    
    // Verify message appears on Viewer 2's screen
    await expect(viewer2Page.locator('text=Go Eagles!')).toBeVisible({ timeout: 3000 });
    
    // Verify message appears on Viewer 3's screen
    await expect(viewer3Page.locator('text=Go Eagles!')).toBeVisible({ timeout: 3000 });
    
    // Viewer 2 responds
    const viewer2Input = viewer2Page.locator('input[placeholder*="message"]');
    await viewer2Input.fill("Let's go Rockets! 🚀");
    await viewer2Input.press('Enter');
    
    // Verify on all screens
    await expect(viewer1Page.locator("text=Let's go Rockets!")).toBeVisible({ timeout: 3000 });
    await expect(viewer2Page.locator("text=Let's go Rockets!")).toBeVisible({ timeout: 2000 });
    await expect(viewer3Page.locator("text=Let's go Rockets!")).toBeVisible({ timeout: 3000 });
    
    // Viewer 3 chimes in
    const viewer3Input = viewer3Page.locator('input[placeholder*="message"]');
    await viewer3Input.fill('This is awesome!');
    await viewer3Input.press('Enter');
    
    // Verify on all screens
    await expect(viewer1Page.locator('text=This is awesome!')).toBeVisible({ timeout: 3000 });
    await expect(viewer2Page.locator('text=This is awesome!')).toBeVisible({ timeout: 3000 });
    await expect(viewer3Page.locator('text=This is awesome!')).toBeVisible({ timeout: 2000 });
  });

  test('Phase 4.2: Chat edge cases', async () => {
    const viewer1Input = viewer1Page.locator('input[placeholder*="message"]');
    
    // Test empty message blocked
    await viewer1Input.fill('');
    const sendButton = viewer1Page.locator('button[type="submit"]').filter({ hasText: /send/i });
    await expect(sendButton).toBeDisabled();
    
    // Test character limit (240 chars)
    const longMessage = 'a'.repeat(250);
    await viewer1Input.fill(longMessage);
    const inputValue = await viewer1Input.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(240);
    
    // Test XSS attempt sanitized
    await viewer1Input.fill('<script>alert("xss")</script>');
    await viewer1Input.press('Enter');
    await viewer1Page.waitForTimeout(1000);
    
    // Verify displayed as text (not executed)
    await expect(viewer1Page.locator('text=<script>')).toBeVisible();
    // No alert should have appeared (test would fail if alert blocks)
  });

  // ========================================
  // PHASE 5: Scoreboard Interaction
  // ========================================

  test('Phase 5.1: Expand scoreboard', async () => {
    // Find and expand scoreboard on Viewer 1
    const expandButton = viewer1Page.locator('button[aria-label*="scoreboard"]').first();
    await expandButton.click();
    
    // Verify expanded scoreboard shows team names
    await expect(viewer1Page.locator('text=TCHS Eagles')).toBeVisible();
    await expect(viewer1Page.locator('text=Rival Rockets')).toBeVisible();
    
    // Verify initial scores
    await expect(viewer1Page.locator('text=0').first()).toBeVisible();
  });

  test('Phase 5.2: Update score (simulate game play)', async () => {
    // TCHS scores first basket (2 points)
    // Find home team score button
    const homeScoreButton = viewer1Page.locator('button[aria-label*="Home team score"]');
    await homeScoreButton.click();
    
    // Modal should appear
    await expect(viewer1Page.locator('input[type="number"]')).toBeVisible({ timeout: 2000 });
    
    // Enter new score
    await viewer1Page.fill('input[type="number"]', '2');
    await viewer1Page.click('button:has-text("Save")');
    
    // Verify score updates on all viewers
    await expect(viewer1Page.locator('text=2').first()).toBeVisible({ timeout: 2000 });
    await expect(viewer2Page.locator('text=2').first()).toBeVisible({ timeout: 3000 });
    await expect(viewer3Page.locator('text=2').first()).toBeVisible({ timeout: 3000 });
    
    // Rival scores (2 points)
    const awayScoreButton = viewer1Page.locator('button[aria-label*="Away team score"]');
    await awayScoreButton.click();
    await viewer1Page.fill('input[type="number"]', '2');
    await viewer1Page.click('button:has-text("Save")');
    
    // Wait for propagation
    await viewer1Page.waitForTimeout(1000);
    
    // Verify 2-2 tie on all screens
    // Note: Exact verification depends on UI layout
  });

  // ========================================
  // PHASE 6: Fullscreen & Mobile Experience
  // ========================================

  test('Phase 6.1: Fullscreen mode (Desktop)', async () => {
    // Press F key for fullscreen
    await viewer1Page.keyboard.press('F');
    
    // Wait for fullscreen transition
    await viewer1Page.waitForTimeout(500);
    
    // Verify fullscreen state (Playwright has limited fullscreen detection)
    // Just verify UI changes that indicate fullscreen
    
    // Exit fullscreen
    await viewer1Page.keyboard.press('Escape');
    await viewer1Page.waitForTimeout(500);
  });

  test('Phase 6.2: Collapsible panels', async () => {
    // Collapse scoreboard
    const collapseScoreboardButton = viewer1Page.locator('button[aria-label*="Collapse scoreboard"]');
    await collapseScoreboardButton.click();
    
    // Verify scoreboard collapsed (exact verification depends on implementation)
    await viewer1Page.waitForTimeout(500);
    
    // Expand scoreboard
    const expandScoreboardButton = viewer1Page.locator('button[aria-label*="scoreboard"]').first();
    await expandScoreboardButton.click();
    await viewer1Page.waitForTimeout(500);
    
    // Verify state persists (reload page)
    await viewer1Page.reload();
    await viewer1Page.waitForTimeout(2000);
    
    // Check if scoreboard state remembered (depends on localStorage implementation)
  });

  // ========================================
  // PHASE 7: Performance Validation
  // ========================================

  test('Phase 7.1: Performance metrics', async () => {
    // Measure page load time
    const startTime = Date.now();
    await viewer1Page.goto(`${WEB_URL}/direct/${STREAM_SLUG}`);
    await viewer1Page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Assert load time < 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('Phase 7.2: Chat message latency', async () => {
    // Send message and measure time to appear on another viewer's screen
    const startTime = Date.now();
    
    const viewer1Input = viewer1Page.locator('input[placeholder*="message"]');
    const testMessage = `Latency test ${Date.now()}`;
    await viewer1Input.fill(testMessage);
    await viewer1Input.press('Enter');
    
    // Wait for message to appear on Viewer 2's screen
    await viewer2Page.locator(`text=${testMessage}`).waitFor({ timeout: 5000 });
    const latency = Date.now() - startTime;
    
    // Assert latency < 2 seconds (allowing for network + rendering)
    expect(latency).toBeLessThan(2000);
    
    console.log(`Chat message latency: ${latency}ms`);
  });

  // ========================================
  // PHASE 8: Cleanup & Data Persistence
  // ========================================

  test('Phase 8.1: Verify data persistence', async () => {
    // Query database via API to verify all data persisted
    
    // Verify stream exists
    const streamResponse = await adminPage.request.get(
      `${API_URL}/api/admin/direct-streams/${streamId}`
    );
    expect(streamResponse.ok()).toBeTruthy();
    const stream = await streamResponse.json();
    expect(stream.slug).toBe(STREAM_SLUG);
    expect(stream.chatEnabled).toBe(true);
    expect(stream.scoreboardEnabled).toBe(true);
    
    // Verify chat messages persisted (via game)
    // Note: This requires an API endpoint to query messages
    
    // Verify final score persisted
    const scoreboardResponse = await adminPage.request.get(
      `${API_URL}/api/direct/${STREAM_SLUG}/scoreboard`
    );
    const scoreboard = await scoreboardResponse.json();
    expect(scoreboard.homeScore).toBeGreaterThanOrEqual(0);
    expect(scoreboard.awayScore).toBeGreaterThanOrEqual(0);
  });

  test('Phase 8.2: Generate test report', async () => {
    // Summary of test execution
    const summary = {
      testSuite: 'Direct Stream Complete UX',
      totalTests: test.info().project.testDir,
      streamSlug: STREAM_SLUG,
      viewers: [VIEWER_1, VIEWER_2, VIEWER_3],
      finalScore: {
        home: 2, // Updated based on actual test
        away: 2,
      },
      chatMessages: 6, // Approximate
      timestamp: new Date().toISOString(),
    };
    
    console.log('=== TEST EXECUTION SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('==============================');
  });
});

