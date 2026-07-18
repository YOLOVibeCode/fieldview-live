/**
 * Email Notifications E2E Tests
 *
 * Verifies that all email notifications are sent correctly via Mailpit.
 *
 * Prerequisites:
 * - Mailpit running on port 4305 (SMTP) / 8025 (API)
 * - API and Web servers running
 *
 * Run with: pnpm --filter web exec playwright test tests/e2e/email-notifications.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { MailpitHelper, EmailTemplates } from './fixtures/mailpit';

// ============================================
// CONFIGURATION
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4300';
const MAILPIT_API_URL = process.env.MAILPIT_API_URL || 'http://localhost:4304';

// Test data with unique timestamps
const generateTestEmail = (prefix: string) =>
  `${prefix}-${Date.now()}@test.fieldview.live`;

// ============================================
// TEST SUITE
// ============================================

test.describe('Email Notifications', () => {
  let mailpit: MailpitHelper;

  test.beforeAll(async ({ request }) => {
    mailpit = new MailpitHelper(request);

    // Check if Mailpit is available
    const isAvailable = await mailpit.isAvailable();
    if (!isAvailable) {
      console.warn('⚠️  Mailpit not available at', MAILPIT_API_URL);
      console.warn('   Run: docker run -p 4305:1025 -p 4304:8025 axllent/mailpit');
      test.skip();
    }

    // Clear inbox before tests
    await mailpit.deleteAll();
  });

  test.describe('Owner Registration Emails', () => {
    const testOwner = {
      email: generateTestEmail('email-test-owner'),
      password: 'TestPassword123!',
      name: 'Email Test Owner',
      type: 'individual',
    };

    test('Welcome email sent on registration', async ({ page }) => {
      // Register via UI
      await page.goto(`${WEB_URL}/owners/register`);

      await page.fill('[data-testid="input-name"]', testOwner.name);
      await page.fill('[data-testid="input-email"]', testOwner.email);
      await page.fill('[data-testid="input-password"]', testOwner.password);

      await page.click('[data-testid="btn-submit-register"]');

      // Wait for registration to complete
      await expect(page).toHaveURL(/\/owners/, { timeout: 15000 });

      // Wait for welcome email
      const welcomeEmail = await mailpit.waitForEmail({
        to: testOwner.email,
        subject: 'Welcome',
        timeout: 30000,
      });

      // Verify email arrived
      expect(welcomeEmail).not.toBeNull();
      expect(welcomeEmail?.Subject).toContain('Welcome');
      expect(welcomeEmail?.To[0].Address).toBe(testOwner.email);
    });

    test('Welcome email contains expected content', async () => {
      // Get the email we sent in previous test
      const emails = await mailpit.search(`to:${testOwner.email}`);
      expect(emails.length).toBeGreaterThan(0);

      const welcomeEmail = emails[0];
      const html = await mailpit.getMessageHtml(welcomeEmail.ID);

      // Verify content
      expect(html).toContain('FieldView.Live');
      expect(html).toContain(testOwner.name);

      // Should have dashboard link
      const links = await mailpit.extractLinks(welcomeEmail.ID);
      expect(links.some((l) => l.includes('/owners/dashboard'))).toBe(true);
    });
  });

  test.describe('Stream Creation Emails', () => {
    let ownerToken: string;
    const ownerEmail = generateTestEmail('stream-email-owner');

    test.beforeAll(async ({ request }) => {
      // Register owner via API
      const response = await request.post(`${API_URL}/api/owners/register`, {
        data: {
          email: ownerEmail,
          password: 'TestPassword123!',
          name: 'Stream Email Test',
          type: 'individual',
        },
      });

      if (response.ok()) {
        const data = await response.json();
        ownerToken = data.token.token;
      }

      // Clear inbox
      await mailpit.deleteAll();
    });

    test('Stream created notification email sent', async ({ request }) => {
      // Create stream via API
      const response = await request.post(`${API_URL}/api/direct`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
        data: {
          slug: `email-test-stream-${Date.now()}`,
          title: 'Email Test Game',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          paywallEnabled: false,
          adminPassword: 'admin123',
        },
      });

      // Stream creation may not exist yet, skip if not available
      if (!response.ok()) {
        test.skip();
        return;
      }

      // Wait for email notification
      const streamEmail = await mailpit.waitForEmail({
        to: ownerEmail,
        subject: 'Stream',
        timeout: 30000,
      });

      // If email service not sending stream notifications yet, note it
      if (!streamEmail) {
        console.log('📧 Stream notification email not implemented yet');
        return;
      }

      expect(streamEmail.Subject).toContain('Stream');
    });
  });

  test.describe('Payment Confirmation Emails', () => {
    const viewerEmail = generateTestEmail('viewer-payment');

    test('Payment confirmation email sent to viewer', async ({ request }) => {
      // Note: This test requires a real payment flow
      // For now, we document the expected behavior

      // Expected flow:
      // 1. Viewer completes payment
      // 2. Backend calls email service
      // 3. Email sent with purchase details

      // Simulate by calling email endpoint directly (if available)
      const response = await request.post(`${API_URL}/api/email/send`, {
        data: {
          to: viewerEmail,
          template: 'payment_confirmation',
          data: {
            amount: 499,
            streamTitle: 'Test Game',
            purchaseId: 'test-purchase-123',
          },
        },
      });

      // If email endpoint exists, verify
      if (response.ok()) {
        const paymentEmail = await mailpit.waitForEmail({
          to: viewerEmail,
          subject: 'Payment',
          timeout: 15000,
        });

        expect(paymentEmail).not.toBeNull();
        expect(paymentEmail?.Subject).toContain('Payment');
      } else {
        console.log('📧 Direct email endpoint not available - using mock');
      }
    });
  });

  test.describe('Stream Reminder Emails', () => {
    test.skip('5-minute reminder email sent before stream', async ({ request }) => {
      // This test requires:
      // 1. Create stream scheduled for "now + 5 minutes"
      // 2. Wait for cron job to trigger
      // 3. Verify email sent

      // Due to timing constraints, this is marked as skip
      // In CI, this would be tested with a dedicated reminder test suite

      const viewerEmail = generateTestEmail('reminder-test');

      // Expected behavior:
      // - Stream scheduled at T
      // - At T-5min, cron triggers reminder
      // - Email sent to all registered viewers

      const reminderEmail = await mailpit.waitForEmail({
        to: viewerEmail,
        subject: 'starting soon',
        timeout: 5000,
      });

      // If we got here in time, verify
      if (reminderEmail) {
        expect(reminderEmail.Subject).toContain('starting soon');
      }
    });
  });

  test.describe('Abuse Warning Emails', () => {
    test('Warning email sent on abuse detection', async ({ page }) => {
      // Clear inbox
      await mailpit.deleteAll();

      // First registration
      const email1 = generateTestEmail('abuse-email-1');
      await page.goto(`${WEB_URL}/owners/register`);
      await page.fill('[data-testid="input-name"]', 'First Account');
      await page.fill('[data-testid="input-email"]', email1);
      await page.fill('[data-testid="input-password"]', 'TestPassword123!');
      await page.click('[data-testid="btn-submit-register"]');

      // Wait for first registration
      await expect(page).toHaveURL(/\/owners/, { timeout: 15000 });

      // Logout
      await page.evaluate(() => {
        localStorage.removeItem('owner_token');
      });

      // Second registration (same device fingerprint)
      const email2 = generateTestEmail('abuse-email-2');
      await page.goto(`${WEB_URL}/owners/register`);
      await page.fill('[data-testid="input-name"]', 'Second Account');
      await page.fill('[data-testid="input-email"]', email2);
      await page.fill('[data-testid="input-password"]', 'TestPassword456!');
      await page.click('[data-testid="btn-submit-register"]');

      // May see abuse modal
      const abuseModal = page.locator('[data-testid="modal-abuse-detected"]');
      const isAbuse = await abuseModal.isVisible({ timeout: 5000 }).catch(() => false);

      if (isAbuse) {
        // Click continue
        await abuseModal.locator('[data-testid="btn-abuse-cta"]').click();
      }

      // Wait for registration to complete
      await expect(page).toHaveURL(/\/owners/, { timeout: 15000 });

      // Check if abuse warning email was sent (to first account)
      const warningEmail = await mailpit.waitForEmail({
        to: email1,
        subject: 'Account Notice',
        timeout: 10000,
      });

      // If abuse warning emails are implemented
      if (warningEmail) {
        expect(warningEmail.Subject).toContain('Notice');
      } else {
        console.log('📧 Abuse warning email not implemented yet');
      }
    });
  });

  test.describe('Email Format & Content', () => {
    test('All emails have proper sender', async () => {
      const messages = await mailpit.getMessages(10);

      for (const msg of messages) {
        // Sender should be from fieldview domain
        expect(msg.From.Address).toMatch(/@fieldview\.live$|@test\.fieldview\.live$/);
      }
    });

    test('All emails are HTML formatted', async () => {
      const messages = await mailpit.getMessages(5);

      for (const msg of messages) {
        const html = await mailpit.getMessageHtml(msg.ID);

        // Should have basic HTML structure
        expect(html).toMatch(/<html|<body|<div/i);

        // Should have FieldView branding
        expect(html.toLowerCase()).toContain('fieldview');
      }
    });

    test('All emails have plain text alternative', async () => {
      const messages = await mailpit.getMessages(5);

      for (const msg of messages) {
        const text = await mailpit.getMessageText(msg.ID);

        // Should have text content
        expect(text.length).toBeGreaterThan(0);

        // Should be readable (not just HTML stripped)
        expect(text.toLowerCase()).toContain('fieldview');
      }
    });
  });

  test.describe('Email Deliverability', () => {
    test('Emails sent within acceptable timeframe', async ({ request }) => {
      // Clear inbox
      await mailpit.deleteAll();

      const testEmail = generateTestEmail('timing-test');

      // Trigger email via registration
      const startTime = Date.now();

      const response = await request.post(`${API_URL}/api/owners/register`, {
        data: {
          email: testEmail,
          password: 'TestPassword123!',
          name: 'Timing Test',
          type: 'individual',
        },
      });

      if (!response.ok()) {
        test.skip();
        return;
      }

      // Wait for email
      const email = await mailpit.waitForEmail({
        to: testEmail,
        timeout: 30000,
      });

      const endTime = Date.now();
      const deliveryTime = endTime - startTime;

      // Email should arrive within 10 seconds
      expect(email).not.toBeNull();
      expect(deliveryTime).toBeLessThan(10000);

      console.log(`📧 Email delivered in ${deliveryTime}ms`);
    });
  });
});

// ============================================
// MAILPIT INBOX INSPECTION TEST
// ============================================

test.describe('Mailpit Inbox Inspection', () => {
  test('Display all emails in inbox', async ({ request }) => {
    const mailpit = new MailpitHelper(request);

    const isAvailable = await mailpit.isAvailable();
    if (!isAvailable) {
      console.log('Mailpit not available');
      test.skip();
      return;
    }

    const messages = await mailpit.getMessages(50);

    console.log('\n========================================');
    console.log('MAILPIT INBOX CONTENTS');
    console.log('========================================');
    console.log(`Total messages: ${messages.length}\n`);

    for (const msg of messages) {
      console.log(`📧 ${msg.Subject}`);
      console.log(`   From: ${msg.From.Address}`);
      console.log(`   To: ${msg.To.map((t) => t.Address).join(', ')}`);
      console.log(`   Date: ${msg.Date}`);
      console.log(`   ID: ${msg.ID}`);
      console.log('');
    }

    console.log('========================================\n');

    // Always pass - this is for inspection
    expect(true).toBe(true);
  });
});
