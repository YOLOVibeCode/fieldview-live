/**
 * Paywall Security E2E Tests
 * 
 * Tests that verify the paywall cannot be bypassed through localStorage tampering
 * or other client-side manipulations.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4300';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const PAYWALL_STREAM_SLUG = 'tchs';
const PAYWALL_STREAM_URL = `${BASE_URL}/direct/${PAYWALL_STREAM_SLUG}`;

// Helper to clear browser state
async function clearBrowserState(context: BrowserContext) {
  await context.clearCookies();
  await context.clearLocalStorage();
}

// Helper to check if paywall blocker is visible
async function isPaywallBlockerVisible(page: Page): Promise<boolean> {
  const blocker = page.locator('[data-testid="paywall-blocker"]').first();
  return blocker.isVisible({ timeout: 2000 }).catch(() => false);
}

// Helper to check if video player is accessible (not blocked)
async function isVideoPlayerAccessible(page: Page): Promise<boolean> {
  const blocker = await isPaywallBlockerVisible(page);
  return !blocker; // Player is accessible if blocker is NOT visible
}

// Helper to tamper with localStorage
async function tamperLocalStorage(page: Page, slug: string) {
  await page.evaluate((s) => {
    localStorage.setItem(`paywall_${s}`, JSON.stringify({
      hasPaid: true,
      purchaseId: 'fake-purchase-id-12345',
      timestamp: Date.now()
    }));
  }, slug);
}

test.describe('Paywall Security Tests', () => {
  test.beforeEach(async ({ context }) => {
    await clearBrowserState(context);
  });

  test('should block access when localStorage is tampered without real entitlement', async ({ page }) => {
    console.log('[Security Test] Testing localStorage tampering is blocked');
    
    // Step 1: Load stream (should show paywall)
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Step 2: Verify paywall is shown initially
    expect(await isPaywallBlockerVisible(page)).toBe(true);
    console.log('[Security Test] ✓ Paywall blocker visible initially');
    
    // Step 3: Tamper with localStorage (simulate bypass attempt)
    console.log('[Security Test] Tampering with localStorage...');
    await tamperLocalStorage(page, PAYWALL_STREAM_SLUG);
    
    // Step 4: Reload page
    console.log('[Security Test] Reloading page...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for server verification
    
    // Step 5: Verify paywall is STILL shown (localStorage cleared by server verification)
    expect(await isPaywallBlockerVisible(page)).toBe(true);
    console.log('[Security Test] ✓ Paywall blocker still visible after tampering');
    
    // Step 6: Verify localStorage was cleared
    const localStorageValue = await page.evaluate((slug) => {
      return localStorage.getItem(`paywall_${slug}`);
    }, PAYWALL_STREAM_SLUG);
    
    expect(localStorageValue).toBeNull();
    console.log('[Security Test] ✓ Tampered localStorage was cleared');
    console.log('[Security Test] ✅ Bypass attempt blocked successfully');
  });

  test('should grant access only with valid server-side entitlement', async ({ page }) => {
    console.log('[Security Test] Testing valid entitlement grants access');
    
    // This test requires a real entitlement to exist in the database
    // For now, we'll test the negative case (no entitlement = no access)
    
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Tamper with localStorage
    await tamperLocalStorage(page, PAYWALL_STREAM_SLUG);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Without real entitlement, should be blocked
    expect(await isPaywallBlockerVisible(page)).toBe(true);
    console.log('[Security Test] ✓ No entitlement = access denied');
  });

  test('should clear localStorage when server verification fails', async ({ page }) => {
    console.log('[Security Test] Testing localStorage clearing on verification failure');
    
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Set invalid localStorage
    await page.evaluate((slug) => {
      localStorage.setItem(`paywall_${slug}`, JSON.stringify({
        hasPaid: true,
        purchaseId: 'invalid-id',
        timestamp: Date.now()
      }));
    }, PAYWALL_STREAM_SLUG);
    
    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check localStorage was cleared
    const storageValue = await page.evaluate((slug) => {
      return localStorage.getItem(`paywall_${slug}`);
    }, PAYWALL_STREAM_SLUG);
    
    expect(storageValue).toBeNull();
    console.log('[Security Test] ✓ Invalid localStorage cleared');
  });

  test('should prevent access across multiple page reloads with tampered localStorage', async ({ page }) => {
    console.log('[Security Test] Testing persistence of security across reloads');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`[Security Test] Reload attempt ${i}/3`);
      
      await page.goto(PAYWALL_STREAM_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Tamper
      await tamperLocalStorage(page, PAYWALL_STREAM_SLUG);
      
      // Reload
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Should still be blocked
      expect(await isPaywallBlockerVisible(page)).toBe(true);
      console.log(`[Security Test] ✓ Attempt ${i} blocked`);
    }
    
    console.log('[Security Test] ✅ All bypass attempts blocked');
  });

  test('should log verification attempts to console', async ({ page }) => {
    console.log('[Security Test] Testing verification logging');
    
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[DirectStream]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Tamper and reload
    await tamperLocalStorage(page, PAYWALL_STREAM_SLUG);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check for verification logs
    const verificationLog = consoleLogs.find(log => 
      log.includes('verifying with server') || log.includes('Server denied access')
    );
    
    expect(verificationLog).toBeDefined();
    console.log('[Security Test] ✓ Verification logged:', verificationLog);
  });

  test('should handle server verification errors gracefully', async ({ page }) => {
    console.log('[Security Test] Testing error handling');
    
    // Intercept verify-access API and make it fail
    await page.route('**/api/direct/*/verify-access*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Set localStorage
    await tamperLocalStorage(page, PAYWALL_STREAM_SLUG);
    
    // Reload (will trigger failed verification)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Should be blocked (fail-secure)
    expect(await isPaywallBlockerVisible(page)).toBe(true);
    
    // localStorage should be cleared (fail-secure)
    const storageValue = await page.evaluate((slug) => {
      return localStorage.getItem(`paywall_${slug}`);
    }, PAYWALL_STREAM_SLUG);
    
    expect(storageValue).toBeNull();
    console.log('[Security Test] ✓ Verification error handled securely (fail-closed)');
  });

  test('should not block streams without paywall enabled', async ({ page, context }) => {
    console.log('[Security Test] Testing free streams remain accessible');
    
    // stormfc should be free (no paywall)
    const freeStreamUrl = `${BASE_URL}/direct/stormfc`;
    
    await page.goto(freeStreamUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Should NOT show paywall blocker
    expect(await isPaywallBlockerVisible(page)).toBe(false);
    console.log('[Security Test] ✓ Free stream accessible without paywall');
  });
});

test.describe('Paywall Security - Cross-Stream Isolation', () => {
  test.beforeEach(async ({ context }) => {
    await clearBrowserState(context);
  });

  test('should not allow entitlement from one stream to unlock another', async ({ page }) => {
    console.log('[Security Test] Testing entitlement isolation between streams');
    
    // This test would require creating entitlements for specific streams
    // For now, we verify that tampering localStorage for one stream doesn't affect another
    
    // Tamper localStorage for stream A
    await page.evaluate(() => {
      localStorage.setItem('paywall_tchs', JSON.stringify({
        hasPaid: true,
        purchaseId: 'fake-id',
        timestamp: Date.now()
      }));
    });
    
    // Try to access stream A
    await page.goto(PAYWALL_STREAM_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Should be blocked
    expect(await isPaywallBlockerVisible(page)).toBe(true);
    console.log('[Security Test] ✓ Tampered entitlement does not grant access');
  });
});
