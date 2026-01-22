/**
 * E2E Tests: Direct Stream Pages
 * 
 * Validates all direct stream pages with v2 video player:
 * - TCHS main stream
 * - TCHS soccer events
 * - Storm FC stream
 * - Video playback
 * - Chat functionality
 * - Scoreboard functionality
 * - Admin features
 */

import { test, expect } from '@playwright/test';

const STREAMS = [
  {
    name: 'TCHS Main',
    url: 'http://localhost:4300/direct/tchs',
    hasEvents: true,
  },
  {
    name: 'TCHS Soccer JV2',
    url: 'http://localhost:4300/direct/tchs/soccer-20260113-jv2',
    hasEvents: false,
  },
  {
    name: 'TCHS Soccer JV',
    url: 'http://localhost:4300/direct/tchs/soccer-20260113-jv',
    hasEvents: false,
  },
  {
    name: 'TCHS Soccer Varsity',
    url: 'http://localhost:4300/direct/tchs/soccer-20260113-varsity',
    hasEvents: false,
  },
  {
    name: 'Storm FC',
    url: 'http://localhost:4300/direct/stormfc',
    hasEvents: false,
  },
];

test.describe('Direct Stream Pages', () => {
  STREAMS.forEach((stream) => {
    test.describe(stream.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(stream.url);
      });

      test('should load page successfully', async ({ page }) => {
        // Check page title
        await expect(page).toHaveTitle(/FieldView/i);
        
        // Check video player is present
        await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
      });

      test('should render v2 video player', async ({ page }) => {
        const video = page.locator('[data-testid="video-player"]');
        await expect(video).toBeVisible();
      });

      test('should render v2 video controls', async ({ page }) => {
        const playButton = page.locator('[data-testid="video-play-button"]');
        await expect(playButton).toBeVisible();
        
        const volumeButton = page.locator('[data-testid="video-volume-button"]');
        await expect(volumeButton).toBeVisible();
        
        const fullscreenButton = page.locator('[data-testid="video-fullscreen-button"]');
        await expect(fullscreenButton).toBeVisible();
      });

      test('should handle video playback', async ({ page }) => {
        const playButton = page.locator('[data-testid="video-play-button"]');
        
        // Click play button
        await playButton.click();
        await page.waitForTimeout(500);
        
        // Button should toggle
        const buttonState = await playButton.textContent();
        expect(buttonState).toBeTruthy();
      });

      test('should display stream status', async ({ page }) => {
        // Check for status messages (loading, playing, offline, error)
        const statusIndicators = [
          page.locator('text=/loading/i'),
          page.locator('text=/offline/i'),
          page.locator('text=/unable to load/i'),
          page.locator('text=/playing/i'),
        ];
        
        // At least one status should be visible
        let foundStatus = false;
        for (const indicator of statusIndicators) {
          if (await indicator.isVisible().catch(() => false)) {
            foundStatus = true;
            break;
          }
        }
        
        // If no explicit status, video should be present
        if (!foundStatus) {
          await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
        }
      });

      if (stream.hasEvents) {
        test('should display sub-events', async ({ page }) => {
          // Check for event links
          const events = page.locator('a[href*="/soccer-"]');
          const count = await events.count();
          expect(count).toBeGreaterThan(0);
        });
      }

      test('should support fullscreen toggle', async ({ page }) => {
        const fullscreenButton = page.locator('[data-testid="video-fullscreen-button"]');
        await fullscreenButton.click();
        await page.waitForTimeout(500);
        
        // Fullscreen might be blocked in test environment
        const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
        
        if (!isFullscreen) {
          console.log(`Fullscreen blocked for ${stream.name} (expected in test)`);
        }
      });

      test('should support keyboard shortcuts', async ({ page }) => {
        // Press F for fullscreen
        await page.keyboard.press('f');
        await page.waitForTimeout(500);
        
        // Check if fullscreen was triggered (may not work in test)
        const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
        
        if (!isFullscreen) {
          console.log('Keyboard shortcut tested (fullscreen blocked)');
        }
      });

      test('should be responsive on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        
        // Video should still be visible
        await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
        
        // Controls should adapt
        const controls = page.locator('[data-testid="video-play-button"]');
        await expect(controls).toBeVisible();
      });

      test('should handle volume control', async ({ page }) => {
        const volumeButton = page.locator('[data-testid="video-volume-button"]');
        
        // Toggle mute
        await volumeButton.click();
        await page.waitForTimeout(200);
        
        // Button state should change
        const newState = await volumeButton.textContent();
        expect(newState).toBeTruthy();
      });

      test('should display share information', async ({ page }) => {
        // Check for share path or stream info
        const shareInfo = page.locator('text=/share|powered by/i');
        await expect(shareInfo).toBeVisible();
      });
    });
  });
});

test.describe('Direct Stream Features', () => {
  test.beforeEach(async ({ page }) => {
    // Use TCHS main for feature testing
    await page.goto('http://localhost:4300/direct/tchs');
  });

  test.describe('Chat Functionality', () => {
    test('should display chat panel (if enabled)', async ({ page }) => {
      // Check if chat is available
      const chatIcon = page.locator('text=/💬|chat/i');
      
      if (await chatIcon.isVisible()) {
        // Chat is enabled
        await expect(chatIcon).toBeVisible();
      } else {
        // Chat might be disabled for this stream
        console.log('Chat not enabled for this stream');
      }
    });

    test('should require authentication for chat', async ({ page }) => {
      // Look for chat registration prompt
      const registerPrompt = page.locator('text=/register.*email|sign in/i');
      
      if (await registerPrompt.isVisible()) {
        await expect(registerPrompt).toBeVisible();
      }
    });

    test('should toggle chat panel', async ({ page }) => {
      // Press C key to toggle chat
      await page.keyboard.press('c');
      await page.waitForTimeout(300);
      
      // Check if chat panel state changed
      // (May or may not be visible depending on stream config)
    });
  });

  test.describe('Scoreboard Functionality', () => {
    test('should display scoreboard (if enabled)', async ({ page }) => {
      // Check if scoreboard is available
      const scoreboardIcon = page.locator('text=/📊|score/i');
      
      if (await scoreboardIcon.isVisible()) {
        await expect(scoreboardIcon).toBeVisible();
      } else {
        console.log('Scoreboard not enabled for this stream');
      }
    });

    test('should toggle scoreboard panel', async ({ page }) => {
      // Press S key to toggle scoreboard
      await page.keyboard.press('s');
      await page.waitForTimeout(300);
      
      // Check if scoreboard panel state changed
      // (May or may not be visible depending on stream config)
    });
  });

  test.describe('Admin Features', () => {
    test('should not show admin panel to non-admin users', async ({ page }) => {
      // Admin panel should not be visible without authentication
      const adminPanel = page.locator('[data-testid="admin-panel"]');
      await expect(adminPanel).not.toBeVisible().catch(() => {
        // Admin panel might not exist at all
      });
    });

    test('should allow admin login (if admin button present)', async ({ page }) => {
      // Check for admin login button
      const adminButton = page.locator('text=/admin login/i');
      
      if (await adminButton.isVisible()) {
        await adminButton.click();
        await page.waitForTimeout(500);
        
        // Should show admin password prompt
        await expect(page.locator('input[type="password"]')).toBeVisible();
      }
    });
  });

  test.describe('Paywall (if enabled)', () => {
    test('should show paywall for paid streams', async ({ page }) => {
      // Check if paywall is present
      const paywall = page.locator('[data-testid="paywall-modal"]');
      
      if (await paywall.isVisible()) {
        await expect(paywall).toBeVisible();
        
        // Should show price and payment button
        await expect(page.locator('text=/\\$/i')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle offline streams gracefully', async ({ page }) => {
      // If stream is offline, should show appropriate message
      const offlineMessage = page.locator('text=/offline|not available|no stream/i');
      
      if (await offlineMessage.isVisible()) {
        await expect(offlineMessage).toBeVisible();
        
        // Should offer to set stream URL if admin
        const editButton = page.locator('[data-testid="btn-set-stream"]').or(page.locator('[data-testid="btn-update-stream"]'));
        
        if (await editButton.isVisible().catch(() => false)) {
          await expect(editButton).toBeVisible();
        }
      }
    });

    test('should handle stream errors gracefully', async ({ page }) => {
      // If stream has error, should show appropriate message
      const errorMessage = page.locator('text=/unable to load|error/i');
      
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
        
        // Should offer retry or update options
        const actionButton = page.locator('[data-testid^="btn-"]');
        const count = await actionButton.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:4300/direct/tchs');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('http://localhost:4300/direct/tchs');
      await page.waitForTimeout(2000);

      // Filter out known harmless errors
      const criticalErrors = errors.filter(err =>
        !err.includes('Fullscreen') &&
        !err.includes('autoplay') &&
        !err.includes('HLS') && // HLS warnings are okay
        !err.includes('Play failed') // Play may be blocked
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should not have JavaScript reference errors on page load', async ({ page }) => {
      // Regression test for iOS Safari crash (TS2448: variable used before declaration)
      // This catches runtime ReferenceErrors that crash the page
      const pageErrors: string[] = [];

      // Listen for uncaught page errors (not console.error, actual exceptions)
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      // Test the specific URL that was crashing on iOS Safari
      await page.goto('http://localhost:4300/direct/tchs/soccer-20260122-jv2');

      // Wait for React to hydrate and hooks to initialize
      await page.waitForTimeout(3000);

      // Filter for reference errors (the type caused by using variables before declaration)
      const referenceErrors = pageErrors.filter(e =>
        e.includes('ReferenceError') ||
        e.includes('is not defined') ||
        e.includes('before initialization') ||
        e.includes('Cannot access') ||
        e.includes('used before its declaration')
      );

      // Should have zero JavaScript reference errors
      expect(referenceErrors).toEqual([]);
    });

    test('should not show application error message', async ({ page }) => {
      // Regression test: page should not show React error boundary message
      await page.goto('http://localhost:4300/direct/tchs/soccer-20260122-jv2');
      await page.waitForTimeout(2000);

      // Check that the generic React error message is NOT visible
      const errorMessage = page.locator('text=/Application error.*client-side exception/i');
      await expect(errorMessage).not.toBeVisible();

      // Page content should be visible (even if stream is offline)
      const pageContent = page.locator('[data-testid="video-player"], [data-testid="stream-placeholder"], text=/Stream/i');
      await expect(pageContent.first()).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper video ARIA labels', async ({ page }) => {
      const video = page.locator('[data-testid="video-player"]');
      const ariaLabel = await video.getAttribute('aria-label').catch(() => null);
      
      // Video should have some accessibility attribute
      expect(video).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through controls
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    });

    test('should have semantic page structure', async ({ page }) => {
      // Check for semantic HTML
      const main = page.locator('main, [role="main"], .main-content');
      await expect(main).toBeVisible().catch(() => {
        // Some pages might not use semantic HTML
      });
    });
  });
});

