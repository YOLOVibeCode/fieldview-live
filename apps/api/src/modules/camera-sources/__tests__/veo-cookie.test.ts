import { describe, it, expect } from 'vitest';

import { pickSessionCookieHeader } from '../providers/veo/veo-cookie';

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
