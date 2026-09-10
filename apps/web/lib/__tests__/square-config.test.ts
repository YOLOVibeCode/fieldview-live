import { describe, it, expect, vi, afterEach } from 'vitest';

import { isSquareConfigReady, resolveSquareConfig } from '@/lib/square-config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveSquareConfig', () => {
  it('uses legacy NEXT_PUBLIC_* when cfg is null', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'legacy-app');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_LOCATION_ID', 'legacy-loc');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_ENVIRONMENT', 'sandbox');
    expect(resolveSquareConfig(null)).toEqual({
      ok: true,
      applicationId: 'legacy-app',
      locationId: 'legacy-loc',
      environment: 'sandbox',
      sdkUrl: 'https://sandbox.web.squarecdn.com/v1/square.js',
    });
  });

  it('uses legacy when provider is legacy', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'legacy-app');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_LOCATION_ID', 'legacy-loc');
    const r = resolveSquareConfig({ provider: 'legacy' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.applicationId).toBe('legacy-app');
      expect(r.locationId).toBe('legacy-loc');
    }
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

  it('treats relay-without-applicationId as legacy', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'legacy-app');
    const r = resolveSquareConfig({ provider: 'relay' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.applicationId).toBe('legacy-app');
    }
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
