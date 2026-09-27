import crypto from 'crypto';

import { describe, expect, it, vi, afterEach } from 'vitest';

import { marketplaceWebhookCallbackUrl, verifyMarketplaceWebhookSignatures } from '../marketplace';

afterEach(() => {
  vi.unstubAllEnvs();
});

const hex = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
const b64 = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64');

describe('verifyMarketplaceWebhookSignatures', () => {
  it('validates connect + noctusoft signatures', () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
    vi.stubEnv('NOCTUSOFT_WEBHOOK_SECRET', 'product');
    vi.stubEnv('API_BASE_URL', 'https://api.fieldview.live');
    const url = marketplaceWebhookCallbackUrl();
    const body = '{"type":"marketplace.checkout.completed"}';
    expect(
      verifyMarketplaceWebhookSignatures(body, { connect: b64('connect', url + body), noctusoft: b64('product', body) }),
    ).toBe(true);
  });

  describe('event v1 (signed with the Connect key)', () => {
    const body = '{"id":"rel_evt_1","type":"marketplace.purchase.paid","version":1}';

    it('accepts hex x-noctusoft-signature and base64 x-relay-signature', () => {
      vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
      vi.stubEnv('API_BASE_URL', 'https://api.fieldview.live');
      const url = marketplaceWebhookCallbackUrl();
      expect(
        verifyMarketplaceWebhookSignatures(body, { noctusoft: hex('connect', body), relay: b64('connect', url + body) }),
      ).toBe(true);
    });

    it('accepts either signature alone', () => {
      vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
      const url = marketplaceWebhookCallbackUrl();
      expect(verifyMarketplaceWebhookSignatures(body, { noctusoft: hex('connect', body) })).toBe(true);
      expect(verifyMarketplaceWebhookSignatures(body, { relay: b64('connect', url + body) })).toBe(true);
    });

    it('rejects when any present signature is wrong, or none is present', () => {
      vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
      const url = marketplaceWebhookCallbackUrl();
      expect(
        verifyMarketplaceWebhookSignatures(body, { noctusoft: hex('connect', body), relay: b64('other', url + body) }),
      ).toBe(false);
      expect(verifyMarketplaceWebhookSignatures(body, { noctusoft: hex('other', body) })).toBe(false);
      expect(verifyMarketplaceWebhookSignatures(body, {})).toBe(false);
    });

    it('rejects when the Connect key is not configured', () => {
      vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', '');
      expect(verifyMarketplaceWebhookSignatures(body, { noctusoft: hex('', body) })).toBe(false);
    });
  });
});
