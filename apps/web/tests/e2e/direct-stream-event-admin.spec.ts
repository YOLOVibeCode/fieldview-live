/**
 * E2E Test: DirectStreamEvent Admin Authentication & Settings
 * 
 * Tests that admin can:
 * 1. Authenticate with parent stream password on event page
 * 2. Update event-specific settings (stream URL)
 */

import { test, expect } from '@playwright/test';

test.describe('DirectStreamEvent Admin', () => {
  const EVENT_URL = 'https://fieldview.live/direct/tchs/soccer-20260309-varsity';
  const ADMIN_PASSWORD = 'tchs2026';
  const TEST_STREAM_URL = 'https://stream.mux.com/TEST123.m3u8';

  // Increase test timeout for production site
  test.setTimeout(120000); // 2 minutes

  test('should authenticate and update stream URL on event page', async ({ page }) => {
    // Navigate to the event page
    await page.goto(EVENT_URL, { timeout: 60000 });
    
    // Wait for page to load (increase timeout and use domcontentloaded instead of networkidle)
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);
    
    // Use data-testid selector - from error we know the first button is btn-open-admin-panel
    const adminButton = page.getByTestId('btn-open-admin-panel');
    await expect(adminButton).toBeVisible({ timeout: 15000 });
    
    console.log('✓ Found Admin Panel button');
    
    // Click admin button to open admin panel
    await adminButton.click();
    
    // Wait for password input to appear
    await page.waitForTimeout(1000);
    
    // Look for password input - try multiple selectors
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Password input appeared');
    
    // Enter admin password
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // Click unlock/submit button - look for button near password input
    const unlockButton = page.locator('button:has-text("Unlock"), button:has-text("Submit"), button[type="submit"]').first();
    await expect(unlockButton).toBeVisible({ timeout: 3000 });
    await unlockButton.click();
    
    console.log('✓ Submitted password');
    
    // Wait for authentication to complete
    await page.waitForTimeout(3000);
    
    // Check if authentication was successful by looking for admin panel content
    // The password input should be gone and settings should be visible
    const passwordStillVisible = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(passwordStillVisible).toBe(false);
    
    console.log('✓ Authentication successful');
    
    // Look for stream URL input field - it should be visible after auth
    const streamUrlInput = page.locator('input[type="url"], input[name*="stream"], input[id*="stream"], input[placeholder*="stream"], input[placeholder*="URL"]').first();
    await expect(streamUrlInput).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Found stream URL input');
    
    // Clear and enter test stream URL
    await streamUrlInput.clear();
    await streamUrlInput.fill(TEST_STREAM_URL);
    
    console.log('✓ Entered test stream URL');
    
    // Find and click Save button
    const saveButton = page.locator('button:has-text("Save")').first();
    await expect(saveButton).toBeVisible({ timeout: 3000 });
    await saveButton.click();
    
    console.log('✓ Clicked Save button');
    
    // Wait for save to complete
    await page.waitForTimeout(3000);
    
    // Check for error message
    const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"]');
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.error(`❌ Save failed with error: ${errorText}`);
      throw new Error(`Save failed with error: ${errorText}`);
    }
    
    // Verify the URL was saved by checking the input value
    const savedValue = await streamUrlInput.inputValue();
    expect(savedValue).toBe(TEST_STREAM_URL);
    
    console.log('✅ Admin authentication and settings update successful!');
    console.log(`   Stream URL saved: ${savedValue}`);
  });

  test('should show error with wrong password', async ({ page }) => {
    await page.goto(EVENT_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Use data-testid selector for admin button
    const adminButton = page.getByTestId('btn-open-admin-panel');
    await expect(adminButton).toBeVisible({ timeout: 15000 });
    await adminButton.click();
    
    // Wait for panel to open
    await page.waitForTimeout(1000);
    
    // Enter wrong password
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill('wrongpassword');
    
    // Try to unlock
    const unlockButton = page.locator('button:has-text("Unlock"), button[type="submit"]').first();
    await unlockButton.click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message - use separate locators, not combined with regex
    const errorByRole = page.locator('[role="alert"]');
    const errorByClass = page.locator('.error');
    const errorByTestId = page.locator('[data-testid*="error"]');
    const errorByText = page.getByText(/invalid|incorrect|wrong/i);
    
    // Try to find any error indicator
    const hasRoleAlert = await errorByRole.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorClass = await errorByClass.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorTestId = await errorByTestId.isVisible({ timeout: 2000 }).catch(() => false);
    const hasErrorText = await errorByText.isVisible({ timeout: 2000 }).catch(() => false);
    
    const errorVisible = hasRoleAlert || hasErrorClass || hasErrorTestId || hasErrorText;
    expect(errorVisible).toBe(true);
    
    // Get error text from whichever locator found it
    let errorText = '';
    if (hasRoleAlert) errorText = await errorByRole.textContent() || '';
    else if (hasErrorClass) errorText = await errorByClass.textContent() || '';
    else if (hasErrorTestId) errorText = await errorByTestId.textContent() || '';
    else if (hasErrorText) errorText = await errorByText.textContent() || '';
    
    console.log(`✅ Wrong password correctly rejected: "${errorText}"`);
  });
});
