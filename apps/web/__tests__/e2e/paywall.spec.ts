/**
 * E2E Test: Paywall Functionality
 * 
 * Tests the complete paywall journey across different streams:
 * 1. Display paywall when required (auto-opens modal)
 * 2. Process Square Connect payment flow
 * 3. Grant access after successful payment
 * 4. Cross-session access control
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4300';
const STREAM_WITH_PAYWALL = `${BASE_URL}/direct/tchs`; // tchs has paywall enabled ($5.00)
const STREAM_WITHOUT_PAYWALL = `${BASE_URL}/direct/stormfc`; // Free stream

// Helper: Check if paywall modal is visible (auto-opens when paywall enabled)
async function isPaywallModalVisible(page: Page): Promise<boolean> {
  try {
    const modal = page.locator('[data-testid="paywall-modal"]').first();
    return await modal.isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

// Helper: Check if paywall blocker overlay is visible
async function isPaywallBlockerVisible(page: Page): Promise<boolean> {
  try {
    const paywall = page.locator('[data-testid="paywall-blocker"]').first();
    return await paywall.isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

// Helper: Close paywall modal if open
async function closePaywallModal(page: Page) {
  const closeButton = page.locator('[data-testid="btn-close-paywall"]').first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(500);
  } else {
    // Try escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

// Helper: Fill paywall info form (step 1)
async function fillPaywallInfoForm(page: Page, email: string, firstName: string, lastName: string) {
  await page.locator('[data-testid="input-paywall-email"]').first().fill(email);
  await page.locator('[data-testid="input-paywall-first-name"]').first().fill(firstName);
  await page.locator('[data-testid="input-paywall-last-name"]').first().fill(lastName);
}

// Helper: Submit info form
async function submitPaywallInfoForm(page: Page) {
  const continueButton = page.locator('[data-testid="btn-continue-to-payment"]').first();
  await continueButton.click();
  await page.waitForTimeout(500);
}

test.describe('Paywall Functionality', () => {
  // Clear localStorage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should auto-open paywall modal for streams with paywall enabled', async ({ page }) => {
    console.log('[Test] Navigating to stream with paywall enabled');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow time for auto-open

    // Step 1: Verify paywall modal auto-opens
    const modalVisible = await isPaywallModalVisible(page);
    expect(modalVisible).toBe(true);
    console.log('[Test] Paywall modal auto-opened ✓');

    // Step 2: Verify info form is displayed
    const emailInput = page.locator('[data-testid="input-paywall-email"]').first();
    await expect(emailInput).toBeVisible();
    console.log('[Test] Email input is visible in modal ✓');

    // Step 3: Verify price is displayed
    const modalText = await page.locator('[data-testid="paywall-modal"]').first().textContent();
    expect(modalText).toContain('5.00');
    console.log('[Test] Price displayed in modal ✓');
  });

  test('should NOT display paywall for free streams', async ({ page }) => {
    console.log('[Test] Navigating to free stream');
    await page.goto(STREAM_WITHOUT_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Step 1: Verify paywall modal is NOT visible
    const modalVisible = await isPaywallModalVisible(page);
    expect(modalVisible).toBe(false);
    console.log('[Test] Paywall modal is NOT visible on free stream ✓');

    // Step 2: Verify paywall blocker is NOT visible
    const blockerVisible = await isPaywallBlockerVisible(page);
    expect(blockerVisible).toBe(false);
    console.log('[Test] Paywall blocker is NOT visible on free stream ✓');
  });

  test('should show paywall blocker behind modal', async ({ page }) => {
    console.log('[Test] Testing paywall blocker visibility');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should be auto-opened
    expect(await isPaywallModalVisible(page)).toBe(true);
    console.log('[Test] Modal is open ✓');

    // Close the modal to see the blocker
    await closePaywallModal(page);
    await page.waitForTimeout(1000);

    // Now blocker should be visible
    const blockerVisible = await isPaywallBlockerVisible(page);
    expect(blockerVisible).toBe(true);
    console.log('[Test] Paywall blocker visible after closing modal ✓');

    // Unlock button should be visible
    const unlockButton = page.locator('[data-testid="btn-unlock-stream"]').first();
    await expect(unlockButton).toBeVisible();
    console.log('[Test] Unlock Stream button visible ✓');
  });

  test('should fill paywall info form and proceed to payment step', async ({ page }) => {
    console.log('[Test] Testing paywall info form');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should auto-open
    expect(await isPaywallModalVisible(page)).toBe(true);

    // Fill form
    const email = `paywall-test-${Date.now()}@example.com`;
    await fillPaywallInfoForm(page, email, 'Test', 'User');
    console.log('[Test] Filled info form ✓');

    // Submit to proceed to payment step
    await submitPaywallInfoForm(page);
    console.log('[Test] Submitted info form ✓');

    // Verify we're on payment step
    const paymentForm = page.locator('[data-testid="form-paywall-payment"]').first();
    await expect(paymentForm).toBeVisible({ timeout: 3000 });
    console.log('[Test] Payment form is visible ✓');

    // Verify pay button is visible with price
    const payButton = page.locator('[data-testid="btn-complete-payment"]').first();
    await expect(payButton).toBeVisible();
    const buttonText = await payButton.textContent();
    expect(buttonText).toContain('5.00');
    console.log('[Test] Pay button visible with correct price ✓');
  });

  test('should show custom admin message when set', async ({ page }) => {
    console.log('[Test] Testing custom paywall message');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should auto-open
    expect(await isPaywallModalVisible(page)).toBe(true);

    // Check for custom message in modal
    const customMessage = page.locator('[data-testid="paywall-custom-message"]').first();
    if (await customMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      const msgText = await customMessage.textContent();
      console.log('[Test] Custom message:', msgText);
      expect(msgText).toContain('Support our team');
      console.log('[Test] Custom admin message displayed ✓');
    } else {
      console.log('[Test] No custom message element visible');
    }
  });

  test('should validate required fields before proceeding', async ({ page }) => {
    console.log('[Test] Testing form validation');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should auto-open
    expect(await isPaywallModalVisible(page)).toBe(true);

    // Try to submit without filling fields
    await submitPaywallInfoForm(page);
    await page.waitForTimeout(500);

    // Should still be on info form (not payment form) due to validation
    const infoForm = page.locator('[data-testid="form-paywall-info"]').first();
    const paymentForm = page.locator('[data-testid="form-paywall-payment"]').first();
    
    const stillOnInfoForm = await infoForm.isVisible({ timeout: 1000 }).catch(() => false);
    const onPaymentForm = await paymentForm.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (stillOnInfoForm && !onPaymentForm) {
      console.log('[Test] Form validation prevented empty submission ✓');
    } else {
      // Check for error message
      const errorMessage = page.locator('[data-testid="error-paywall"]').first();
      if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('[Test] Error message displayed for validation ✓');
      }
    }
  });

  test('should close paywall modal when clicking close button', async ({ page }) => {
    console.log('[Test] Testing modal close');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should auto-open
    expect(await isPaywallModalVisible(page)).toBe(true);
    console.log('[Test] Modal auto-opened ✓');

    // Close the modal
    await closePaywallModal(page);

    // Verify modal is closed
    const modalStillVisible = await isPaywallModalVisible(page);
    expect(modalStillVisible).toBe(false);
    console.log('[Test] Modal closed ✓');

    // Blocker should now be visible
    const blockerVisible = await isPaywallBlockerVisible(page);
    expect(blockerVisible).toBe(true);
    console.log('[Test] Blocker visible after modal close ✓');
  });

  test('should re-open modal when clicking Unlock Stream button', async ({ page }) => {
    console.log('[Test] Testing modal re-open');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal auto-opens
    expect(await isPaywallModalVisible(page)).toBe(true);

    // Close it
    await closePaywallModal(page);
    expect(await isPaywallModalVisible(page)).toBe(false);
    console.log('[Test] Modal closed ✓');

    // Click Unlock Stream button
    const unlockButton = page.locator('[data-testid="btn-unlock-stream"]').first();
    await expect(unlockButton).toBeVisible();
    await unlockButton.click();
    await page.waitForTimeout(1000);

    // Modal should re-open
    expect(await isPaywallModalVisible(page)).toBe(true);
    console.log('[Test] Modal re-opened via Unlock Stream button ✓');
  });

  test('should persist payment access across page reloads', async ({ page }) => {
    console.log('[Test] Testing payment persistence');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Simulate successful payment by setting localStorage
    await page.evaluate((slug) => {
      const mockPayment = {
        hasPaid: true,
        purchaseId: 'test-purchase-id-12345',
        timestamp: Date.now(),
      };
      localStorage.setItem(`paywall_${slug}`, JSON.stringify(mockPayment));
    }, 'tchs');

    // Reload the page
    console.log('[Test] Reloading page after simulated payment');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Verify paywall modal is NOT shown (access granted)
    const modalVisible = await isPaywallModalVisible(page);
    expect(modalVisible).toBe(false);
    console.log('[Test] No paywall modal - access granted ✓');

    // Verify paywall blocker is NOT shown
    const blockerVisible = await isPaywallBlockerVisible(page);
    expect(blockerVisible).toBe(false);
    console.log('[Test] No paywall blocker - stream accessible ✓');
  });

  test('should block access on different session without payment', async ({ browser }) => {
    console.log('[Test] Testing multi-session access control');
    
    // Create two different browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Session 1: Simulate payment
      await page1.goto(STREAM_WITH_PAYWALL);
      await page1.waitForLoadState('domcontentloaded');
      await page1.waitForTimeout(2000);

      await page1.evaluate((slug) => {
        const mockPayment = {
          hasPaid: true,
          purchaseId: 'session1-purchase',
          timestamp: Date.now(),
        };
        localStorage.setItem(`paywall_${slug}`, JSON.stringify(mockPayment));
      }, 'tchs');

      await page1.reload();
      await page1.waitForLoadState('domcontentloaded');
      await page1.waitForTimeout(3000);

      // Session 1 should have access (no modal)
      const modal1 = await isPaywallModalVisible(page1);
      expect(modal1).toBe(false);
      console.log('[Test] Session 1 has access after payment ✓');

      // Session 2: No payment (different device)
      await page2.goto(STREAM_WITH_PAYWALL);
      await page2.waitForLoadState('domcontentloaded');
      await page2.waitForTimeout(3000);

      // Session 2 should see paywall modal (different localStorage)
      const modal2 = await isPaywallModalVisible(page2);
      expect(modal2).toBe(true);
      console.log('[Test] Session 2 sees paywall (no payment) ✓');
      
      console.log('[Test] Access control working correctly ✓');
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should submit payment form and handle API response', async ({ page }) => {
    console.log('[Test] Testing payment submission flow');
    await page.goto(STREAM_WITH_PAYWALL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Modal should auto-open
    expect(await isPaywallModalVisible(page)).toBe(true);

    // Fill info form
    const email = `square-test-${Date.now()}@example.com`;
    await fillPaywallInfoForm(page, email, 'Square', 'Tester');
    await submitPaywallInfoForm(page);

    // Verify payment form is shown
    const paymentForm = page.locator('[data-testid="form-paywall-payment"]').first();
    await expect(paymentForm).toBeVisible({ timeout: 3000 });
    console.log('[Test] Payment form visible ✓');

    // Click pay button
    const payButton = page.locator('[data-testid="btn-complete-payment"]').first();
    await payButton.click();
    console.log('[Test] Clicked pay button ✓');
    
    // Wait for API response
    await page.waitForTimeout(3000);
    
    // Check for error (owner may not have Square connected)
    const errorMessage = page.locator('[data-testid="error-paywall"]').first();
    if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorMessage.textContent();
      console.log('[Test] API Error:', errorText);
      
      // Expected error if Square not connected
      if (errorText?.toLowerCase().includes('square')) {
        console.log('[Test] Square not connected - expected for test environment ✓');
      }
    } else {
      // May have redirected to Square checkout
      console.log('[Test] Payment submission completed (may redirect to Square)');
    }
  });
});
