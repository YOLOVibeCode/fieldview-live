import { describe, expect, it, vi } from 'vitest';

import { MarketplaceStoreService } from '../MarketplaceStoreService';

describe('MarketplaceStoreService', () => {
  it('calls store onboarding URL endpoint', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ onboarding_url: 'https://store.test/onboard' }), { status: 200 }),
    );
    const svc = new MarketplaceStoreService(
      { storeBaseUrl: 'https://store.test', productKey: 'fieldview', apiKey: 'k' },
      fetchFn as unknown as typeof fetch,
    );
    const url = await svc.buildOnboardingUrl('owner-1', 'https://fieldview.live/done');
    expect(url).toBe('https://store.test/onboard');
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('/sellers/owner-1/onboarding');
  });
});
