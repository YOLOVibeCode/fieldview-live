import crypto from 'crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyRelayInboundSignature } from '../verifyRelayInboundSignature';

afterEach(() => {
  vi.unstubAllEnvs();
});

const sign = (secret: string, url: string, body: string) =>
  crypto.createHmac('sha256', secret).update(url + body).digest('base64');

describe('verifyRelayInboundSignature', () => {
  const url = 'https://api.fieldview.live/api/webhooks/twilio';
  const body = 'From=%2B15551234567&Body=STOP';

  it('accepts a valid signature', () => {
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-secret');
    const sig = sign('test-secret', url, body);
    expect(verifyRelayInboundSignature(url, body, sig)).toBe(true);
  });

  it('rejects missing signature when secret is set', () => {
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-secret');
    expect(verifyRelayInboundSignature(url, body, undefined)).toBe(false);
  });

  it('rejects tampered body', () => {
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-secret');
    const sig = sign('test-secret', url, body);
    expect(verifyRelayInboundSignature(url, body + 'x', sig)).toBe(false);
  });

  it('rejects wrong public URL', () => {
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-secret');
    const sig = sign('test-secret', url, body);
    expect(verifyRelayInboundSignature(url + '/status', body, sig)).toBe(false);
  });
});
