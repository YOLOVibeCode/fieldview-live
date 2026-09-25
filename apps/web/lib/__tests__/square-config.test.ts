import { describe, it, expect } from 'vitest';

import { isSquareConfigReady, resolveSquareConfig } from '@/lib/square-config';

describe('resolveSquareConfig', () => {
  it('blocks when cfg is null', () => {
    expect(resolveSquareConfig(null)).toEqual({ ok: false, reason: 'PAYMENT_CONFIG_MISSING' });
  });

  it('uses relay values + production SDK url when provider is relay', () => {
    expect(
      resolveSquareConfig({
        provider: 'relay',
        applicationId: 'relay-app',
        environment: 'production',
        locationId: 'relay-loc',
      }),
    ).toEqual({
      ok: true,
      applicationId: 'relay-app',
      locationId: 'relay-loc',
      environment: 'production',
      sdkUrl: 'https://web.squarecdn.com/v1/square.js',
    });
  });

  it('blocks when relay returns a null coach location', () => {
    expect(
      resolveSquareConfig({
        provider: 'relay',
        applicationId: 'relay-app',
        environment: 'sandbox',
        locationId: null,
      }),
    ).toEqual({ ok: false, reason: 'COACH_LOCATION_MISSING' });
  });

  it('blocks when relay returns an empty coach location', () => {
    expect(
      resolveSquareConfig({
        provider: 'relay',
        applicationId: 'relay-app',
        environment: 'sandbox',
        locationId: '  ',
      }),
    ).toEqual({ ok: false, reason: 'COACH_LOCATION_MISSING' });
  });

  it('blocks when applicationId is missing', () => {
    expect(
      resolveSquareConfig({
        provider: 'relay',
        environment: 'sandbox',
        locationId: 'loc',
      }),
    ).toEqual({ ok: false, reason: 'PAYMENT_CONFIG_MISSING' });
  });
});

describe('isSquareConfigReady', () => {
  it('narrows to success config', () => {
    const resolved = resolveSquareConfig({
      provider: 'relay',
      applicationId: 'relay-app',
      environment: 'sandbox',
      locationId: 'loc',
    });
    expect(isSquareConfigReady(resolved)).toBe(true);
    if (isSquareConfigReady(resolved)) {
      expect(resolved.applicationId).toBe('relay-app');
    }
  });
});
