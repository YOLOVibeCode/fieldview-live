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
const ADMIN_PASSWORD = 'tchs2026';
const BASE_URL = process.env.WEB_URL || 'http://localhost:4300';

test.describe('Admin Panel JWT Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the direct stream page
    await page.goto(`${BASE_URL}/direct/${TEST_SLUG}`);
    
    // Wait for page to load
    await expect(page).toHaveTitle(/FieldView\.Live/);
  });

  test('should show password-locked admin panel', async ({ page }) => {
    // Click "Edit Stream" button
    await page.getByTestId('btn-edit-stream').click();
    
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
    await page.getByTestId('btn-edit-stream').click();
    
    // Enter password
    await page.getByTestId('admin-password-input').fill('test');
    
    // Unlock button should be enabled
    await expect(page.getByTestId('unlock-admin-button')).toBeEnabled();
  });

  test('should show error for invalid password', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-edit-stream').click();
    
    // Enter wrong password
    await page.getByTestId('admin-password-input').fill('wrongpassword');
    
    // Click unlock
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for error message
    await expect(page.getByTestId('unlock-error-message')).toBeVisible();
    await expect(page.getByTestId('unlock-error-message')).toContainText('Invalid password');
  });

  test('should unlock admin panel with correct password and show settings', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-edit-stream').click();
    
    // Wait for unlock form
    await expect(page.getByTestId('admin-panel-unlock')).toBeVisible();
    
    // Enter correct password
    await page.getByTestId('admin-password-input').fill(ADMIN_PASSWORD);
    
    // Click unlock
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for settings panel to appear
    await expect(page.getByTestId('admin-panel-settings')).toBeVisible({ timeout: 5000 });
    
    // Check that settings fields are visible
    await expect(page.getByTestId('stream-url-input')).toBeVisible();
    await expect(page.getByTestId('chat-enabled-checkbox')).toBeVisible();
    await expect(page.getByTestId('paywall-enabled-checkbox')).toBeVisible();
    await expect(page.getByTestId('save-settings-button')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Open admin panel
    await page.getByTestId('btn-edit-stream').click();
    
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

  test('should update stream settings with JWT auth', async ({ page }) => {
    // Open admin panel and unlock
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('admin-password-input').fill(ADMIN_PASSWORD);
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for settings panel
    await expect(page.getByTestId('admin-panel-settings')).toBeVisible({ timeout: 5000 });
    
    // Update stream URL
    const testUrl = 'https://test.stream.com/test.m3u8';
    await page.getByTestId('stream-url-input').fill(testUrl);
    
    // Toggle chat off
    await page.getByTestId('chat-enabled-checkbox').uncheck();
    
    // Save settings
    await page.getByTestId('save-settings-button').click();
    
    // Wait for success message
    await expect(page.getByTestId('save-success-message')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('save-success-message')).toContainText('Settings saved successfully');
  });

  test('should handle expired JWT token gracefully', async ({ page }) => {
    // Open admin panel and unlock
    await page.getByTestId('btn-edit-stream').click();
    await page.getByTestId('admin-password-input').fill(ADMIN_PASSWORD);
    await page.getByTestId('unlock-admin-button').click();
    
    // Wait for settings panel
    await expect(page.getByTestId('admin-panel-settings')).toBeVisible({ timeout: 5000 });
    
    // Inject an expired/invalid token into localStorage or component state
    // (This would require exposing the token or mocking the API to return 401)
    // For now, this is a placeholder test that would need backend support
    
    // Future: Test that 401 response shows "Session expired" message
  });
});

test.describe('Admin Panel Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/direct/${TEST_SLUG}`);
    
    // Open admin panel
    await page.getByTestId('btn-edit-stream').click();
    
    // Check for aria-label on password field
    const passwordInput = page.getByTestId('admin-password-input');
    await expect(passwordInput).toHaveAttribute('aria-label', 'Admin password');
    
    // Check for aria-label on toggle button
    const toggleButton = page.getByTestId('toggle-password-visibility');
    await expect(toggleButton).toHaveAttribute('aria-label', /password/i);
  });

  test('should have proper form structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/direct/${TEST_SLUG}`);
    
    // Open admin panel
    await page.getByTestId('btn-edit-stream').click();
    
    // Check that password field is in a form
    const form = page.getByTestId('admin-unlock-form');
    await expect(form).toBeVisible();
    
    // Check that form contains password input
    await expect(form.locator('[data-testid="admin-password-input"]')).toBeVisible();
    
    // Check that form has a submit button
    await expect(form.locator('[type="submit"]')).toBeVisible();
  });
});

