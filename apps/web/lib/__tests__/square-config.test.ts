import { describe, it, expect, vi, afterEach } from 'vitest';

import { resolveSquareConfig } from '@/lib/square-config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveSquareConfig', () => {
  it('uses legacy NEXT_PUBLIC_* when cfg is null', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'legacy-app');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_LOCATION_ID', 'legacy-loc');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_ENVIRONMENT', 'sandbox');
    expect(resolveSquareConfig(null)).toEqual({
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
    expect(r.applicationId).toBe('legacy-app');
    expect(r.locationId).toBe('legacy-loc');
  });

  it('uses relay values + production SDK url when provider is relay', () => {
    expect(
      resolveSquareConfig({ provider: 'relay', applicationId: 'relay-app', environment: 'production', locationId: 'relay-loc' }),
    ).toEqual({
      applicationId: 'relay-app',
      locationId: 'relay-loc',
      environment: 'production',
      sdkUrl: 'https://web.squarecdn.com/v1/square.js',
    });
  });

  it('falls back locationId to NEXT_PUBLIC when the relay returns a null location', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_LOCATION_ID', 'legacy-loc');
    const r = resolveSquareConfig({ provider: 'relay', applicationId: 'relay-app', environment: 'sandbox', locationId: null });
    expect(r.applicationId).toBe('relay-app');
    expect(r.locationId).toBe('legacy-loc');
    expect(r.sdkUrl).toContain('sandbox.web.squarecdn.com');
  });

  it('treats relay-without-applicationId as legacy', () => {
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'legacy-app');
    expect(resolveSquareConfig({ provider: 'relay' }).applicationId).toBe('legacy-app');
  });
});
