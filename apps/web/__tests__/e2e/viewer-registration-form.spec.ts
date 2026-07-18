/**
 * E2E Test: Viewer Registration Form
 * 
 * Validates that the registration form works correctly with automation tools.
 * This test ensures the form is automation-friendly per UI AUTOMATION REQUIREMENTS.
 */

import { test, expect } from '@playwright/test';

const STREAM_URL = 'http://localhost:4300/direct/tchs-basketball-20260110';
const API_URL = 'http://localhost:4301';
const MAILPIT_URL = 'http://localhost:4304';

test.describe('Viewer Registration Form - Automation Friendly', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto(STREAM_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if chat panel is collapsed and expand it
    const chatPanel = page.locator('[data-testid="form-viewer-unlock"]');
    const isFormVisible = await chatPanel.isVisible().catch(() => false);
    
    if (!isFormVisible) {
      // Click the chat expand button using the proper data-testid
      const chatExpandButton = page.locator('[data-testid="btn-expand-chat"]');
      await chatExpandButton.waitFor({ state: 'visible', timeout: 10000 });
      await chatExpandButton.click();
      await page.waitForTimeout(500); // Wait for animation
    }
  });

  test('should have proper data-testid attributes for automation', async ({ page }) => {
    // Form should already be expanded by beforeEach
    await page.waitForSelector('[data-testid="form-viewer-unlock"]', { state: 'visible' });
    
    // Verify all form elements have data-testid
    const emailInput = page.locator('[data-testid="input-email"]');
    const firstNameInput = page.locator('[data-testid="input-first-name"]');
    const lastNameInput = page.locator('[data-testid="input-last-name"]');
    const submitButton = page.locator('[data-testid="btn-unlock-stream"]');
    
    await expect(emailInput).toBeVisible();
    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should have proper semantic HTML and accessibility attributes', async ({ page }) => {
    // Verify inputs have proper labels
    const emailLabel = page.locator('label:has-text("Email")');
    const firstNameLabel = page.locator('label:has-text("First Name")');
    const lastNameLabel = page.locator('label:has-text("Last Name")');
    
    await expect(emailLabel).toBeVisible();
    await expect(firstNameLabel).toBeVisible();
    await expect(lastNameLabel).toBeVisible();
    
    // Verify inputs have aria-labels
    const emailInput = page.locator('[aria-label="Email address"]');
    const firstNameInput = page.locator('[aria-label="First name"]');
    const lastNameInput = page.locator('[aria-label="Last name"]');
    
    await expect(emailInput).toBeVisible();
    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
  });

  test('should accept typed input and preserve values', async ({ page }) => {
    // Fill form using Playwright (which properly triggers React events)
    await page.fill('[data-testid="input-email"]', 'playwright@test.com');
    await page.fill('[data-testid="input-first-name"]', 'Play');
    await page.fill('[data-testid="input-last-name"]', 'Wright');
    
    // Verify values are preserved
    await expect(page.locator('[data-testid="input-email"]')).toHaveValue('playwright@test.com');
    await expect(page.locator('[data-testid="input-first-name"]')).toHaveValue('Play');
    await expect(page.locator('[data-testid="input-last-name"]')).toHaveValue('Wright');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Fill with invalid email
    await page.fill('[data-testid="input-email"]', 'invalid-email');
    await page.fill('[data-testid="input-first-name"]', 'Test');
    await page.fill('[data-testid="input-last-name"]', 'User');
    
    // Submit form
    await page.click('[data-testid="btn-unlock-stream"]');
    
    // Should show email validation error
    const emailError = page.locator('[data-testid="error-email"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('valid email');
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    // Submit empty form
    await page.click('[data-testid="btn-unlock-stream"]');
    
    // Should show all validation errors
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-first-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-last-name"]')).toBeVisible();
  });

  test('should successfully submit valid registration', async ({ page }) => {
    // Fill form with valid data
    const testEmail = `e2e-${Date.now()}@test.com`;
    await page.fill('[data-testid="input-email"]', testEmail);
    await page.fill('[data-testid="input-first-name"]', 'E2E');
    await page.fill('[data-testid="input-last-name"]', 'Test');
    
    // Submit form
    await page.click('[data-testid="btn-unlock-stream"]');
    
    // Wait for success - form should disappear and chat input should appear
    await page.waitForSelector('[data-testid="form-viewer-unlock"]', { state: 'hidden', timeout: 5000 });
    
    // Chat input should now be visible
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test('should preserve form values after validation error', async ({ page }) => {
    // Fill with invalid email but valid names
    await page.fill('[data-testid="input-email"]', 'bad-email');
    await page.fill('[data-testid="input-first-name"]', 'Preserved');
    await page.fill('[data-testid="input-last-name"]', 'Values');
    
    // Submit form (will fail validation)
    await page.click('[data-testid="btn-unlock-stream"]');
    
    // Wait for validation error
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
    
    // Values should still be in the form (not reset)
    await expect(page.locator('[data-testid="input-email"]')).toHaveValue('bad-email');
    await expect(page.locator('[data-testid="input-first-name"]')).toHaveValue('Preserved');
    await expect(page.locator('[data-testid="input-last-name"]')).toHaveValue('Values');
  });

  test('should save draft to localStorage as user types', async ({ page }) => {
    // Fill email
    await page.fill('[data-testid="input-email"]', 'draft@test.com');
    
    // Wait a bit for auto-save
    await page.waitForTimeout(500);
    
    // Check localStorage
    const savedDraft = await page.evaluate(() => {
      const saved = localStorage.getItem('fieldview_viewer_unlock_draft');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(savedDraft).toBeTruthy();
    expect(savedDraft.email).toBe('draft@test.com');
  });

  test('should restore draft from localStorage on page load', async ({ page }) => {
    // Fill form
    await page.fill('[data-testid="input-email"]', 'restored@test.com');
    await page.fill('[data-testid="input-first-name"]', 'Restored');
    await page.fill('[data-testid="input-last-name"]', 'User');
    
    // Wait for auto-save
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="form-viewer-unlock"]', { state: 'visible' });
    
    // Values should be restored
    await expect(page.locator('[data-testid="input-email"]')).toHaveValue('restored@test.com');
    await expect(page.locator('[data-testid="input-first-name"]')).toHaveValue('Restored');
    await expect(page.locator('[data-testid="input-last-name"]')).toHaveValue('User');
  });
});

test.describe('Viewer Registration - End-to-End Flow', () => {
  test('should complete full registration flow including email', async ({ page }) => {
    await page.goto(STREAM_URL);
    
    // Clear previous state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Wait for form
    await page.waitForSelector('[data-testid="form-viewer-unlock"]', { state: 'visible' });
    
    // Fill registration form
    const testEmail = `fullflow-${Date.now()}@test.com`;
    await page.fill('[data-testid="input-email"]', testEmail);
    await page.fill('[data-testid="input-first-name"]', 'Full');
    await page.fill('[data-testid="input-last-name"]', 'Flow');
    
    // Submit
    await page.click('[data-testid="btn-unlock-stream"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="form-viewer-unlock"]', { state: 'hidden', timeout: 10000 });
    
    // Verify chat is now unlocked
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    
    // Verify localStorage has viewer token
    const viewerIdentity = await page.evaluate(() => {
      const saved = localStorage.getItem('fieldview_viewer_identity');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(viewerIdentity).toBeTruthy();
    expect(viewerIdentity.email).toBe(testEmail);
    expect(viewerIdentity.viewerToken).toBeTruthy();
  });
});

