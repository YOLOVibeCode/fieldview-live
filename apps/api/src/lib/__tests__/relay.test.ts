import crypto from 'crypto';

import { describe, it, expect, vi, afterEach } from 'vitest';

import { verifyRelaySignature } from '../relay';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyRelaySignature', () => {
  const url = 'https://fieldview.live/api/webhooks/relay';
  const body = '{"type":"refund.updated"}';
  const sign = (secret: string) => crypto.createHmac('sha256', secret).update(url + body).digest('base64');

  it('returns true for a valid signature', () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 's3cret');
    expect(verifyRelaySignature(sign('s3cret'), body, url)).toBe(true);
  });

  it('returns false for a wrong signature', () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 's3cret');
    expect(verifyRelaySignature(sign('other-secret'), body, url)).toBe(false);
  });

  it('returns false when the secret is not configured', () => {
    expect(verifyRelaySignature(sign('s3cret'), body, url)).toBe(false);
  });

  it('returns false when the signature header is missing', () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 's3cret');
    expect(verifyRelaySignature(undefined, body, url)).toBe(false);
  });
});
