/**
 * HLS Single Instance Test
 *
 * Verifies that only ONE HLS instance is created when loading a stream.
 * Catches the "multiple viewers" bug where re-initialization loops cause
 * multiple HLS instances to be created.
 */

import { test, expect } from '@playwright/test';

test.describe('HLS Single Instance', () => {
  test('demo stream page creates only one HLS instance', async ({ page }) => {
    // Collect console logs
    const hlsLogs: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[StreamTest]') || text.includes('HLS')) {
        hlsLogs.push(text);
      }
    });

    // Navigate to stream test page
    await page.goto('/demo/stream');

    // Wait for HLS to initialize
    await page.waitForTimeout(3000);

    // Count "HLS instance created" messages
    const instanceCreatedLogs = hlsLogs.filter(log =>
      log.includes('HLS instance created')
    );

    console.log('HLS Logs:', hlsLogs);
    console.log('Instance created count:', instanceCreatedLogs.length);

    // Should only create ONE instance
    expect(instanceCreatedLogs.length).toBe(1);

    // Should NOT have "Destroying existing HLS instance" on initial load
    const destroyLogs = hlsLogs.filter(log =>
      log.includes('Destroying existing HLS instance')
    );
    expect(destroyLogs.length).toBe(0);
  });

  test('clicking test stream button properly recreates HLS', async ({ page }) => {
    const hlsLogs: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[StreamTest]')) {
        hlsLogs.push(text);
      }
    });

    await page.goto('/demo/stream');
    await page.waitForTimeout(3000); // Wait for initial load

    // Clear logs
    hlsLogs.length = 0;

    // Click "Mux Dev Test" button to switch streams
    await page.click('text=Mux Dev Test');
    await page.waitForTimeout(3000);

    // Should create a new HLS instance
    const createLogs = hlsLogs.filter(log =>
      log.includes('HLS instance created')
    );

    console.log('After switch logs:', hlsLogs);
    console.log('After switch - Create count:', createLogs.length);

    // Should create exactly one new instance
    expect(createLogs.length).toBe(1);

    // Verify stream is playing (status changes to playing)
    const playLogs = hlsLogs.filter(log =>
      log.includes('Video playback started') || log.includes('Video: play event')
    );
    expect(playLogs.length).toBeGreaterThan(0);
  });

  test('status shows PLAYING after stream loads (no loop)', async ({ page }) => {
    await page.goto('/demo/stream');

    // Wait for stream to load
    await page.waitForTimeout(5000);

    // Check status indicator (in header, uppercase)
    const statusIndicator = page.locator('span.uppercase:text-is("playing")');
    const loadingIndicator = page.locator('span.uppercase:text-is("loading")');

    // Should be PLAYING, not stuck in LOADING loop
    await expect(statusIndicator).toBeVisible();
    expect(await loadingIndicator.count()).toBe(0);

    // Also verify video is actually playing
    const videoState = page.locator('text=Status: playing');
    await expect(videoState).toBeVisible();
  });
});
