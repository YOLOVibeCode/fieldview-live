import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACCESS_TOKEN_HEADER,
  accessHeaders,
  captureAccessToken,
  clearAccessToken,
  getAccessToken,
  parentSlugFromBootstrapUrl,
} from '../paywall-access';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
});

describe('parentSlugFromBootstrapUrl', () => {
  it('reads the parent slug from a stream bootstrap URL', () => {
    expect(parentSlugFromBootstrapUrl('/api/direct/tchs/bootstrap')).toBe('tchs');
  });

  it('reads the parent slug from an encoded event bootstrap URL', () => {
    expect(parentSlugFromBootstrapUrl(`/api/direct/${encodeURIComponent('TCHS/soccer-jv')}/bootstrap`)).toBe('tchs');
  });

  it('reads the parent slug from the public event bootstrap URL', () => {
    expect(parentSlugFromBootstrapUrl('/api/public/direct/tchs/events/soccer-jv/bootstrap')).toBe('tchs');
  });
});

describe('captureAccessToken', () => {
  it('saves ?access= from the link and strips it from the address bar', () => {
    const replaceState = vi.fn();
    const token = captureAccessToken(
      'tchs',
      { href: 'https://fieldview.live/direct/tchs?access=tok-1&x=2', search: '?access=tok-1&x=2' },
      { replaceState },
    );

    expect(token).toBe('tok-1');
    expect(getAccessToken('tchs')).toBe('tok-1');
    expect(replaceState).toHaveBeenCalledWith(null, '', 'https://fieldview.live/direct/tchs?x=2');
  });

  it('returns the saved token when the link has none', () => {
    store.set('fv_access_tchs', 'tok-saved');
    const replaceState = vi.fn();
    const token = captureAccessToken(
      'tchs',
      { href: 'https://fieldview.live/direct/tchs', search: '' },
      { replaceState },
    );

    expect(token).toBe('tok-saved');
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('keeps tokens per stream', () => {
    store.set('fv_access_other', 'tok-other');
    expect(getAccessToken('tchs')).toBeNull();
  });

  it('clears a token the server rejected', () => {
    store.set('fv_access_tchs', 'tok-old');
    clearAccessToken('tchs');
    expect(getAccessToken('tchs')).toBeNull();
  });

  it('survives storage that throws (private mode)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
        removeItem: () => {
          throw new Error('denied');
        },
      },
    });
    const token = captureAccessToken(
      'tchs',
      { href: 'https://fieldview.live/direct/tchs?access=tok-1', search: '?access=tok-1' },
      { replaceState: vi.fn() },
    );
    expect(token).toBe('tok-1');
  });
});

describe('accessHeaders', () => {
  it('sends the access token and the admin token when present', () => {
    expect(accessHeaders('tok-1', 'jwt-1')).toEqual({
      [ACCESS_TOKEN_HEADER]: 'tok-1',
      Authorization: 'Bearer jwt-1',
    });
  });

  it('sends nothing for an anonymous viewer', () => {
    expect(accessHeaders(null, null)).toEqual({});
  });
});
