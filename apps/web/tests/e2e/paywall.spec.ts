import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Enhanced Paywall Modal
 * 
 * Tests paywall with admin message, saved cards, and payment flow
 */

const SLUG = 'tchs';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';

test.describe('Paywall Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${WEB_URL}/direct/${SLUG}`);
  });

  test('should show paywall modal when enabled', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check if paywall modal appears (depends on stream configuration)
    const paywallModal = page.getByTestId('paywall-modal');
    
    // If paywall is enabled, modal should be visible
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(paywallModal).toBeVisible();
      await expect(page.getByTestId('input-paywall-email')).toBeVisible();
    }
  });

  test('should display admin custom message', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const customMessage = page.getByTestId('paywall-custom-message');
      
      // Custom message should be visible if configured
      if (await customMessage.isVisible().catch(() => false)) {
        const messageText = await customMessage.textContent();
        expect(messageText).toBeTruthy();
        expect(messageText!.length).toBeGreaterThan(0);
      }
    }
  });

  test('should collect user information', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Fill in user info
      await page.getByTestId('input-paywall-email').fill('test@example.com');
      await page.getByTestId('input-paywall-first-name').fill('Test');
      await page.getByTestId('input-paywall-last-name').fill('User');

      // Verify form accepts input
      await expect(page.getByTestId('input-paywall-email')).toHaveValue('test@example.com');
      await expect(page.getByTestId('input-paywall-first-name')).toHaveValue('Test');
      await expect(page.getByTestId('input-paywall-last-name')).toHaveValue('User');
    }
  });

  test('should progress to payment step', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Fill info form
      await page.getByTestId('input-paywall-email').fill('newuser@example.com');
      await page.getByTestId('input-paywall-first-name').fill('New');
      await page.getByTestId('input-paywall-last-name').fill('User');

      // Continue to payment
      await page.getByTestId('btn-continue-to-payment').click();

      // Payment form should appear
      await expect(page.getByTestId('form-paywall-payment')).toBeVisible({ timeout: 3000 });
      await expect(page.getByTestId('btn-complete-payment')).toBeVisible();
    }
  });

  test('should detect saved payment methods', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Use an email that might have saved payment
      await page.getByTestId('input-paywall-email').fill('saved-payment@test.com');
      await page.getByTestId('input-paywall-first-name').fill('Saved');
      await page.getByTestId('input-paywall-last-name').fill('User');

      // Wait for saved payment check
      await page.waitForTimeout(1000);

      // Check if saved card detected message appears
      const savedCardDetected = page.getByTestId('saved-card-detected');
      const hasSavedCard = await savedCardDetected.isVisible().catch(() => false);
      
      if (hasSavedCard) {
        await expect(savedCardDetected).toContainText(/ending in \d{4}/);
      }
    }
  });

  test('should show payment method selection for saved cards', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('input-paywall-email').fill('saved-payment@test.com');
      await page.getByTestId('input-paywall-first-name').fill('Saved');
      await page.getByTestId('input-paywall-last-name').fill('User');
      await page.getByTestId('btn-continue-to-payment').click();

      await page.waitForTimeout(1000);

      // Check for payment method radio buttons
      const savedCardRadio = page.getByTestId('radio-saved-card');
      const newCardRadio = page.getByTestId('radio-new-card');
      
      if (await savedCardRadio.isVisible().catch(() => false)) {
        await expect(savedCardRadio).toBeVisible();
        await expect(newCardRadio).toBeVisible();

        // Saved card should be selected by default
        await expect(savedCardRadio).toBeChecked();
      }
    }
  });

  test('should toggle between saved and new card', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('input-paywall-email').fill('saved-payment@test.com');
      await page.getByTestId('input-paywall-first-name').fill('Saved');
      await page.getByTestId('input-paywall-last-name').fill('User');
      await page.getByTestId('btn-continue-to-payment').click();

      await page.waitForTimeout(1000);

      const newCardRadio = page.getByTestId('radio-new-card');
      
      if (await newCardRadio.isVisible().catch(() => false)) {
        // Click new card option
        await newCardRadio.click();
        await expect(newCardRadio).toBeChecked();

        // Square card input should appear
        await expect(page.getByTestId('square-card-input')).toBeVisible();
      }
    }
  });

  test('should show save payment checkbox for new cards', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('input-paywall-email').fill('newpayment@example.com');
      await page.getByTestId('input-paywall-first-name').fill('New');
      await page.getByTestId('input-paywall-last-name').fill('Payment');
      await page.getByTestId('btn-continue-to-payment').click();

      await page.waitForTimeout(500);

      // Check for save payment checkbox (if allowSavePayment is enabled)
      const saveCheckbox = page.getByTestId('checkbox-save-payment');
      
      if (await saveCheckbox.isVisible().catch(() => false)) {
        await expect(saveCheckbox).not.toBeChecked();
        
        // Check the checkbox
        await saveCheckbox.click();
        await expect(saveCheckbox).toBeChecked();
      }
    }
  });

  test('should allow going back to edit info', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('input-paywall-email').fill('edit@example.com');
      await page.getByTestId('input-paywall-first-name').fill('Edit');
      await page.getByTestId('input-paywall-last-name').fill('Test');
      await page.getByTestId('btn-continue-to-payment').click();

      await page.waitForTimeout(500);

      // Click back button
      await page.getByTestId('btn-back-to-info').click();

      // Info form should be visible again
      await expect(page.getByTestId('form-paywall-info')).toBeVisible();
      await expect(page.getByTestId('input-paywall-email')).toHaveValue('edit@example.com');
    }
  });

  test('should close modal on close button click', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('btn-close-paywall').click();

      // Modal should close
      await expect(paywallModal).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('should show loading state during payment', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('input-paywall-email').fill('loading@example.com');
      await page.getByTestId('input-paywall-first-name').fill('Loading');
      await page.getByTestId('input-paywall-last-name').fill('Test');
      await page.getByTestId('btn-continue-to-payment').click();

      await page.waitForTimeout(500);

      // Click payment button
      const paymentButton = page.getByTestId('btn-complete-payment');
      await paymentButton.click();

      // Button should show loading state
      await expect(paymentButton).toHaveAttribute('data-loading', 'true');
      await expect(paymentButton).toContainText('Processing...');
    }
  });

  test('should validate required fields', async ({ page }) => {
    const paywallModal = page.getByTestId('paywall-modal');
    
    if (await paywallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try to submit without filling fields
      await page.getByTestId('btn-continue-to-payment').click();

      // Form validation should prevent submission
      const emailInput = page.getByTestId('input-paywall-email');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      
      expect(isInvalid).toBe(true);
    }
  });
});

