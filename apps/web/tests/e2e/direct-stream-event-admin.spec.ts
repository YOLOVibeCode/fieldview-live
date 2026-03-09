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

  test('should authenticate and update stream URL on event page', async ({ page }) => {
    // Navigate to the event page
    await page.goto(EVENT_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for admin/settings button (could be various selectors)
    const adminButton = page.locator('button:has-text("Edit"), button:has-text("Settings"), button:has-text("Admin"), [data-testid*="admin"], [data-testid*="edit"]').first();
    
    // Check if admin button exists
    const adminButtonExists = await adminButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!adminButtonExists) {
      console.log('Admin button not found. Available buttons:');
      const buttons = await page.locator('button').all();
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`  - "${text}"`);
      }
      throw new Error('Admin/Edit button not found on page');
    }
    
    // Click admin button to open admin panel
    await adminButton.click();
    
    // Wait for password input to appear
    const passwordInput = page.locator('input[type="password"], input[name*="password"], input[id*="password"], [data-testid*="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    
    // Enter admin password
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // Click unlock/submit button
    const unlockButton = page.locator('button:has-text("Unlock"), button:has-text("Sign in"), button[type="submit"]').first();
    await unlockButton.click();
    
    // Wait for authentication to complete
    await page.waitForTimeout(2000);
    
    // Check if authentication was successful (password input should disappear)
    await expect(passwordInput).not.toBeVisible({ timeout: 5000 });
    
    // Look for stream URL input field
    const streamUrlInput = page.locator('input[type="url"], input[name*="stream"], input[id*="stream"], input[placeholder*="stream"]').first();
    await expect(streamUrlInput).toBeVisible({ timeout: 5000 });
    
    // Clear and enter test stream URL
    await streamUrlInput.clear();
    await streamUrlInput.fill(TEST_STREAM_URL);
    
    // Find and click Save button
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
    
    // Check for success message or no error
    const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"]');
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      throw new Error(`Save failed with error: ${errorText}`);
    }
    
    // Verify the URL was saved by checking the input value
    const savedValue = await streamUrlInput.inputValue();
    expect(savedValue).toBe(TEST_STREAM_URL);
    
    console.log('✅ Admin authentication and settings update successful!');
  });

  test('should show error with wrong password', async ({ page }) => {
    await page.goto(EVENT_URL);
    await page.waitForLoadState('networkidle');
    
    // Find and click admin button
    const adminButton = page.locator('button:has-text("Edit"), button:has-text("Settings"), button:has-text("Admin"), [data-testid*="admin"], [data-testid*="edit"]').first();
    await adminButton.click({ timeout: 5000 });
    
    // Enter wrong password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('wrongpassword');
    
    // Try to unlock
    const unlockButton = page.locator('button:has-text("Unlock"), button[type="submit"]').first();
    await unlockButton.click();
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Check for error message
    const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"], text=/invalid|incorrect|wrong/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    
    console.log('✅ Wrong password correctly rejected');
  });
});
