import { describe, it, expect, vi } from 'vitest';

import { pickSessionCookieHeader } from '../implementations/veo-cookie';
import { VeoCookieSeeder } from '../implementations/VeoCookieSeeder';
import type { IVeoAuthenticator, VeoSession } from '../interfaces';

describe('pickSessionCookieHeader', () => {
  it('keeps only _session* cookies and joins them as a header', () => {
    const header = pickSessionCookieHeader([
      { name: '_ga', value: 'x' },
      { name: '_session', value: 'AAA' },
      { name: 'ajs_user_id', value: 'y' },
      { name: '_session.sig', value: 'BBB' },
      { name: '_session.legacy', value: 'CCC' },
    ]);
    expect(header).toBe('_session=AAA; _session.sig=BBB; _session.legacy=CCC');
  });

  it('returns empty string when no session cookie is present', () => {
    expect(pickSessionCookieHeader([{ name: '_ga', value: 'x' }])).toBe('');
    expect(pickSessionCookieHeader([])).toBe('');
  });
});

function fakeAuth(cookies: Array<{ name: string; value: string }>): {
  auth: IVeoAuthenticator;
  logout: any;
} {
  const logout = vi.fn(async () => {});
  const session: VeoSession = { context: { cookies: vi.fn(async () => cookies) } };
  const auth: IVeoAuthenticator = { login: vi.fn(async () => session), logout };
  return { auth, logout };
}

describe('VeoCookieSeeder', () => {
  it('logs in, extracts the _session cookie header, then logs out', async () => {
    const { auth, logout } = fakeAuth([
      { name: '_session', value: 'S1' },
      { name: '_session.sig', value: 'S2' },
      { name: '_ga', value: 'noise' },
    ]);
    const header = await new VeoCookieSeeder(auth).seed({ email: 'e', password: 'p' });
    expect(header).toBe('_session=S1; _session.sig=S2');
    expect(auth.login).toHaveBeenCalledWith({ email: 'e', password: 'p' });
    expect(logout).toHaveBeenCalledTimes(1); // browser always closed
  });

  it('throws (and still logs out) when no session cookie is captured', async () => {
    const { auth, logout } = fakeAuth([{ name: '_ga', value: 'noise' }]);
    await expect(new VeoCookieSeeder(auth).seed({ email: 'e', password: 'p' })).rejects.toThrow(/session cookie/i);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
