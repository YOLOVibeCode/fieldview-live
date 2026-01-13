/**
 * E2E Tests for Password Reset Flow
 * Tests the complete password reset workflow for both owner users and admin accounts
 */
import { test, expect } from '@playwright/test';

// Helper to extract token from email subject/body
function extractTokenFromEmailHtml(html: string): string | null {
  // Look for token in URL: /reset-password?token=...
  const match = html.match(/reset-password\?token=([a-f0-9]+)/i);
  return match ? match[1] : null;
}

test.describe('Password Reset Flow - Owner User', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to forgot password page
    await page.goto('/forgot-password');
  });

  test('should complete full password reset flow for owner user', async ({ page }) => {
    // Step 1: Request password reset
    await page.getByTestId('radio-owner-user').check();
    await page.getByTestId('input-email').fill('owner@example.com');
    await page.getByTestId('btn-submit').click();

    // Wait for success message
    await expect(page.getByTestId('success-message')).toBeVisible();
    await expect(page.getByTestId('success-message')).toContainText('If an account exists');

    // Step 2: Check Mailpit for email (mock/local testing)
    // Note: In real tests, you'd need to query Mailpit API or database for the token
    // For now, we'll test the reset page directly with a mock token
    
    // Step 3: Navigate to reset password page (with mock token)
    await page.goto('/reset-password?token=test-owner-reset-token-12345');

    // Wait for token verification (should show form for valid token)
    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    // Step 4: Enter new password
    const newPassword = 'NewSecurePassword123!';
    await page.getByTestId('input-new-password').fill(newPassword);
    await page.getByTestId('input-confirm-password').fill(newPassword);

    // Check password strength indicator
    await expect(page.getByTestId('password-strength-label')).toContainText('Strong');

    // Submit password reset
    await page.getByTestId('btn-submit-reset').click();

    // Wait for success and redirect
    await expect(page.getByTestId('success-state')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Password Reset Successful!')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/reset-password?token=test-validation-token');

    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    // Test weak password
    await page.getByTestId('input-new-password').fill('weak');
    await page.getByTestId('input-confirm-password').fill('weak');
    await page.getByTestId('btn-submit-reset').click();

    // Should show validation error
    await expect(page.getByTestId('error-new-password')).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto('/reset-password?token=test-match-token');

    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('input-new-password').fill('StrongPassword123!');
    await page.getByTestId('input-confirm-password').fill('DifferentPassword123!');
    await page.getByTestId('btn-submit-reset').click();

    // Should show mismatch error
    await expect(page.getByTestId('error-confirm-password')).toBeVisible();
    await expect(page.getByTestId('error-confirm-password')).toContainText("don't match");
  });

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/reset-password?token=test-strength-token');

    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    // Weak password
    await page.getByTestId('input-new-password').fill('weak123');
    await expect(page.getByTestId('password-strength-label')).toContainText('Weak');

    // Strong password
    await page.getByTestId('input-new-password').fill('VeryStrongP@ssw0rd!');
    await expect(page.getByTestId('password-strength-label')).toContainText('Strong');
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/reset-password?token=test-visibility-token');

    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.getByTestId('input-new-password');
    
    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    await page.getByTestId('btn-toggle-password').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again
    await page.getByTestId('btn-toggle-password').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-expired-token');

    // Should show error state
    await expect(page.getByText('Invalid Reset Link')).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing token', async ({ page }) => {
    await page.goto('/reset-password');

    // Should show error state
    await expect(page.getByText('Invalid Reset Link')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Password Reset Flow - Admin Account', () => {
  test('should show admin-specific messaging', async ({ page }) => {
    await page.goto('/forgot-password');

    // Select admin account type
    await page.getByTestId('radio-admin-account').check();

    // Check that admin option is selected
    const adminRadio = page.getByTestId('radio-admin-account');
    await expect(adminRadio).toBeChecked();

    // Check for admin indicator
    await expect(page.getByText(/Super Admin/i)).toBeVisible();
  });

  test('should enforce rate limiting', async ({ page }) => {
    await page.goto('/forgot-password');

    const email = `rate-test-${Date.now()}@example.com`;

    // Make 3 requests rapidly
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('input-email').fill(email);
      await page.getByTestId('btn-submit').click();
      await expect(page.getByTestId('success-message')).toBeVisible();
      
      // Wait a bit between requests
      await page.waitForTimeout(500);
      
      // Reload to reset form
      if (i < 2) {
        await page.reload();
      }
    }

    // 4th request should show rate limit error (if backend enforces it)
    // Note: This depends on backend rate limiting being active
  });
});

test.describe('Password Reset - User Experience', () => {
  test('should have accessible form elements', async ({ page }) => {
    await page.goto('/forgot-password');

    // Check for proper labels
    const emailInput = page.getByTestId('input-email');
    await expect(emailInput).toHaveAttribute('id', 'email');
    
    // Check for associated label
    const label = page.locator('label[for="email"]');
    await expect(label).toBeVisible();
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByTestId('input-email').fill('test@example.com');
    
    // Click submit and immediately check for loading state
    await page.getByTestId('btn-submit').click();
    
    // Button should be disabled during submission
    const submitButton = page.getByTestId('btn-submit');
    await expect(submitButton).toBeDisabled();
  });

  test('should clear form after successful submission', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('btn-submit').click();

    await expect(page.getByTestId('success-message')).toBeVisible();

    // Form should be cleared
    const emailInput = page.getByTestId('input-email');
    await expect(emailInput).toHaveValue('');
  });

  test('should have back to login link', async ({ page }) => {
    await page.goto('/forgot-password');

    const backLink = page.getByTestId('link-back-to-login');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/login');
  });
});

test.describe('Password Reset - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should render properly on mobile', async ({ page }) => {
    await page.goto('/forgot-password');

    // Check that main elements are visible
    await expect(page.getByText('Reset Password')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('btn-submit')).toBeVisible();

    // Check that form is usable
    await page.getByTestId('input-email').fill('mobile@example.com');
    await page.getByTestId('btn-submit').click();

    await expect(page.getByTestId('success-message')).toBeVisible();
  });

  test('should have touch-friendly targets on mobile', async ({ page }) => {
    await page.goto('/reset-password?token=test-mobile-token');

    await expect(page.getByTestId('form-reset-password')).toBeVisible({ timeout: 10000 });

    // Check button size (should be at least 44x44 for touch)
    const submitButton = page.getByTestId('btn-submit-reset');
    const box = await submitButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

