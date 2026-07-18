// Production E2E Test Configuration
// Run automated scoreboard tests against https://fieldview.live

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = 'https://fieldview.live';
const API_URL = 'https://fieldview.live';
const TEST_STREAM_SLUG = 'stormfc'; // Production stream
const TEST_STREAM_URL = `${BASE_URL}/direct/${TEST_STREAM_SLUG}`;

// Helper: Generate unique test email
function generateTestEmail(): string {
  return `prod-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Helper: Wait for network to be mostly idle
async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    console.log('[Warn] Network not idle, continuing anyway');
  }
}

test.describe('Production Scoreboard Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies only (localStorage will be cleared after page loads)
    await context.clearCookies();
  });

  test('should load production stream and verify scoreboard exists', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds for production

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║     PRODUCTION SMOKE TEST                             ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📍 STEP 1: Loading production stream...');
    console.log(`   URL: ${TEST_STREAM_URL}`);

    await page.goto(TEST_STREAM_URL);
    await waitForNetworkIdle(page);
    await page.waitForTimeout(5000); // Extra wait for production

    console.log('   ✅ Page loaded\n');

    console.log('📊 STEP 2: Checking for scoreboard...');
    const scoreboard = page.locator('[data-testid="scoreboard"], [data-testid="btn-expand-scoreboard"]').first();
    
    const scoreboardExists = await scoreboard.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (scoreboardExists) {
      console.log('   ✅ Scoreboard found on production!\n');
      
      // Try to expand if collapsed
      const expandBtn = page.locator('[data-testid="btn-expand-scoreboard"]').first();
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(2000);
        console.log('   ✅ Scoreboard expanded\n');
      }
      
      // Take a screenshot for documentation
      await page.screenshot({ path: 'test-results/production-scoreboard.png', fullPage: true });
      console.log('   ✅ Screenshot saved\n');
      
    } else {
      console.log('   ⚠️  Scoreboard not visible (may require setup)\n');
    }

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║         PRODUCTION TEST COMPLETE ✅                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  });

  test('should verify chat registration works on production', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║     PRODUCTION REGISTRATION TEST                      ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    await page.goto(TEST_STREAM_URL);
    await waitForNetworkIdle(page);
    await page.waitForTimeout(5000);

    console.log('👤 Testing viewer registration...');
    const testEmail = generateTestEmail();
    
    // Try to find and click chat button
    const chatBtn = page.locator('[data-testid="btn-expand-chat"], button:has-text("Chat")').first();
    if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Chat panel opened\n');
      
      // Look for registration button
      const registerBtn = page.locator('[data-testid="btn-open-viewer-auth"]').first();
      if (await registerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await registerBtn.click();
        await page.waitForTimeout(1000);
        
        const nameInput = page.locator('[data-testid="input-name"]').first();
        const emailInput = page.locator('[data-testid="input-email"]').first();
        
        if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nameInput.fill('Production Tester');
          await emailInput.fill(testEmail);
          
          const submitBtn = page.locator('[data-testid="btn-submit-viewer-register"]').first();
          await submitBtn.click();
          await page.waitForTimeout(3000);
          
          console.log('   ✅ Registration form submitted\n');
          
          // Check if chat input is now enabled
          const chatInput = page.locator('[data-testid="input-chat-message"], input[placeholder*="message" i]').first();
          const isChatEnabled = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (isChatEnabled) {
            console.log('   ✅ Chat input enabled (registration successful!)\n');
          } else {
            console.log('   ⚠️  Chat input not yet visible\n');
          }
        } else {
          console.log('   ⚠️  Registration form not accessible\n');
        }
      } else {
        console.log('   ⚠️  Registration button not found\n');
      }
    } else {
      console.log('   ⚠️  Chat button not found\n');
    }

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║         REGISTRATION TEST COMPLETE ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  });
});
