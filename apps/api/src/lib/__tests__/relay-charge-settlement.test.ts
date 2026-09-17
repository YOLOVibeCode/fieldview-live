import { describe, it, expect, afterEach, vi } from 'vitest';

import { resolveRelayChargeSettlement } from '../relay-charge-settlement';

describe('resolveRelayChargeSettlement', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses relay appFeeCents when present', () => {
    const split = resolveRelayChargeSettlement({
      amountCents: 1000,
      processorFeeCents: 59,
      appFeeCents: 100,
    });

    expect(split.platformFeeCents).toBe(100);
    expect(split.grossAmountCents).toBe(1000);
    expect(split.processorFeeCents).toBe(59);
    expect(split.ownerNetCents).toBe(841);
  });

  it('falls back to calculateMarketplaceSplit when appFeeCents is null', () => {
    vi.stubEnv('PLATFORM_FEE_PERCENT', '10');

    const split = resolveRelayChargeSettlement({
      amountCents: 1000,
      processorFeeCents: 59,
      appFeeCents: null,
    });

    expect(split.platformFeeCents).toBe(100);
    expect(split.ownerNetCents).toBe(841);
  });
});
