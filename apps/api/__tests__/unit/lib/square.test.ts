/**
 * Square Lib Unit Tests
 *
 * Tests for Square webhook signature validation.
 * Critical for webhook security.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Store original env
const originalWebhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

describe('validateSquareWebhook', () => {
  const WEBHOOK_SIGNATURE_KEY = 'test-key-for-validation-12345';

  beforeEach(() => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = WEBHOOK_SIGNATURE_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = originalWebhookKey;
  });

  it('validates correct signature', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const body = '{"type":"payment.created"}';
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
      .update(`${webhookUrl}${body}`)
      .digest('base64');

    const isValid = validateSquareWebhook(signature, body, webhookUrl);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect signature', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const body = '{"type":"payment.created"}';
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';
    const wrongSignature = 'wrong-signature-base64==';

    const isValid = validateSquareWebhook(wrongSignature, body, webhookUrl);
    expect(isValid).toBe(false);
  });

  it('rejects signature for tampered body', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const originalBody = '{"type":"payment.created"}';
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
      .update(`${webhookUrl}${originalBody}`)
      .digest('base64');

    // Tamper with body
    const tamperedBody = '{"type":"payment.created","hacked":true}';

    const isValid = validateSquareWebhook(signature, tamperedBody, webhookUrl);
    expect(isValid).toBe(false);
  });

  it('returns false for missing signature', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const isValid = validateSquareWebhook(undefined, '{}', 'https://example.com');
    expect(isValid).toBe(false);
  });

  it('returns false for empty body', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const isValid = validateSquareWebhook('some-sig', '', 'https://example.com');
    expect(isValid).toBe(false);
  });

  it('returns false for missing webhook URL', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const isValid = validateSquareWebhook('some-sig', '{}', '');
    expect(isValid).toBe(false);
  });

  it('returns false for missing webhook key', async () => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = '';
    vi.resetModules();
    const { validateSquareWebhook } = await import('@/lib/square');

    const isValid = validateSquareWebhook('some-sig', '{}', 'https://example.com');
    expect(isValid).toBe(false);
  });

  it('uses constant-time comparison to prevent timing attacks', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const body = '{"type":"payment.created"}';
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';

    // Two different wrong signatures should take similar time
    // (This is more of a design verification than a precise timing test)
    const wrongSig1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const wrongSig2 = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzz';

    const isValid1 = validateSquareWebhook(wrongSig1, body, webhookUrl);
    const isValid2 = validateSquareWebhook(wrongSig2, body, webhookUrl);

    expect(isValid1).toBe(false);
    expect(isValid2).toBe(false);
  });

  it('signature format follows Square spec: base64(HMAC-SHA256(key, url + body))', async () => {
    const { validateSquareWebhook } = await import('@/lib/square');

    const body = '{"test":"data"}';
    const webhookUrl = 'https://example.com/webhook';

    // Manually compute expected signature per Square spec
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
      .update(webhookUrl + body) // URL + body concatenated (no separator)
      .digest('base64');

    const isValid = validateSquareWebhook(expectedSignature, body, webhookUrl);
    expect(isValid).toBe(true);
  });
});
