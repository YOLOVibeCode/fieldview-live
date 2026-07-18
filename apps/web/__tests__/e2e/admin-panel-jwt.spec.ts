/**
 * E2E Tests for JWT-based Admin Panel
 * 
 * Tests the full authentication flow:
 * 1. Open admin panel
 * 2. Enter password
 * 3. Unlock (JWT token)
 * 4. View/edit settings
 */

import { test, expect } from '@playwright/test';

const TEST_SLUG = 'tchs';
const TEST_EVENT = 'soccer-20260120-varsity';
const ADMIN_PASSWORD = 'tchs2026';

test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Admin Panel JWT Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/direct/${TEST_SLUG}/${TEST_EVENT}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="btn-open-admin-panel"]', { timeout: 15000 });
  });

  test('should show password-locked admin panel', async ({ page }) => {
    // Click "Edit Stream" button
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Wait for admin panel to appear
    await expect(page.getByTestId('admin-panel-unlock')).toBeVisible();
    
    // Check for password field
    await expect(page.getByTestId('admin-password-input')).toBeVisible();
    
    // Check for unlock button
    await expect(page.getByTestId('unlock-admin-button')).toBeVisible();
    await expect(page.getByTestId('unlock-admin-button')).toBeDisabled(); // No password entered yet
  });

  test('should enable unlock button when password is entered', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Enter password
    await page.getByTestId('admin-password-input').fill('test');
    
    // Unlock button should be enabled
    await expect(page.getByTestId('unlock-admin-button')).toBeEnabled();
  });

  test('should show error for invalid password', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Enter wrong password
    await page.getByTestId('admin-password-input').fill('wrongpassword');
    
    // Click unlock
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for error message (frontend maps UNAUTHORIZED to user-friendly message)
    await expect(page.getByTestId('unlock-error-message')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('unlock-error-message')).not.toBeEmpty();
  });

  test('should unlock admin panel with correct password and show settings', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Wait for unlock form
    await expect(page.getByTestId('admin-panel-unlock')).toBeVisible();
    
    // Enter correct password
    await page.getByTestId('admin-password-input').fill(ADMIN_PASSWORD);
    
    // Click unlock
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for settings panel to appear
    await expect(page.getByTestId('admin-panel-settings')).toBeVisible({ timeout: 15000 });
    
    // Check that settings fields are visible
    await expect(page.getByTestId('stream-url-input')).toBeVisible();
    await expect(page.getByTestId('chat-enabled-checkbox')).toBeVisible();
    await expect(page.getByTestId('paywall-enabled-checkbox')).toBeVisible();
    await expect(page.getByTestId('save-settings-button')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-open-admin-panel').click();
    
    const passwordInput = page.getByTestId('admin-password-input');
    const toggleButton = page.getByTestId('toggle-password-visibility');
    
    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Enter password
    await passwordInput.fill('test1234');
    
    // Click toggle to show
    await toggleButton.click();
    
    // Should be text type now
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle to hide
    await toggleButton.click();
    
    // Should be password type again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test.fixme('should update stream settings with JWT auth', async ({ page }) => {
    // FIXME: Active video streams prevent the admin-panel-settings from rendering
    // in Playwright because the video player DOM keeps the component in portrait/mobile
    // layout. Needs a DirectStreamEvent without an active stream, or a test-only page.
    await page.goto('/direct/dentondiablos/soccer-2008-20260325', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="btn-open-admin-panel"]', { timeout: 15000 });

    await page.getByTestId('btn-open-admin-panel').click();
    await page.getByTestId('admin-password-input').fill('devil2026');
    await page.getByTestId('unlock-admin-button').click();
    
    await expect(page.getByTestId('admin-panel-settings')).toBeVisible({ timeout: 15000 });
    
    const testUrl = 'https://test.stream.com/test.m3u8';
    await page.getByTestId('stream-url-input').fill(testUrl);
    await page.getByTestId('chat-enabled-checkbox').uncheck();
    await page.getByTestId('save-settings-button').click();
    
    await expect(page.getByTestId('save-success-message')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('save-success-message')).toContainText(/saved|success|refreshing/i);
  });

  test.skip('should handle expired JWT token gracefully', async () => {
    // Placeholder: requires mocking the API to return 401 on save.
    // Future: inject expired token via localStorage, attempt save, verify "Session expired" message.
  });
});

test.describe('Admin Panel Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`/direct/${TEST_SLUG}/${TEST_EVENT}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="btn-open-admin-panel"]', { timeout: 15000 });
    
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Check for aria-label on password field
    const passwordInput = page.getByTestId('admin-password-input');
    await expect(passwordInput).toHaveAttribute('aria-label', 'Admin password');
    
    // Check for aria-label on toggle button
    const toggleButton = page.getByTestId('toggle-password-visibility');
    await expect(toggleButton).toHaveAttribute('aria-label', /password/i);
  });

  test('should have proper form structure', async ({ page }) => {
    await page.goto(`/direct/${TEST_SLUG}/${TEST_EVENT}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="btn-open-admin-panel"]', { timeout: 15000 });
    
    await page.getByTestId('btn-open-admin-panel').click();
    
    // Check that password field is in a form
    const form = page.getByTestId('admin-unlock-form');
    await expect(form).toBeVisible();
    
    // Check that form contains password input
    await expect(form.locator('[data-testid="admin-password-input"]')).toBeVisible();
    
    // Check that form has a submit button
    await expect(form.locator('[type="submit"]')).toBeVisible();
  });
});

