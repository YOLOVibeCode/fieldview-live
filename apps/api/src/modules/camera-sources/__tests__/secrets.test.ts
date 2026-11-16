import { describe, it, expect } from 'vitest';

import { openSecrets, sealSecrets, secretsNeedReseal } from '../secrets';

const SCOPE = { ownerAccountId: 'owner-1', provider: 'veo' };

describe('camera source secrets', () => {
  it('encrypts every value and decrypts it back', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc', password: 'p$ss' }, SCOPE);

    expect(Object.keys(sealed).sort()).toEqual(['password', 'sessionCookie']);
    expect(sealed.sessionCookie).not.toContain('_session=abc');
    expect(sealed.password).not.toContain('p$ss');
    expect(openSecrets(sealed, SCOPE)).toEqual({ sessionCookie: '_session=abc', password: 'p$ss' });
  });

  it('cannot be opened for another owner, another provider, or under another field name', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc' }, SCOPE);

    expect(() => openSecrets(sealed, { ...SCOPE, ownerAccountId: 'owner-2' })).toThrow(/sessionCookie/);
    expect(() => openSecrets(sealed, { ...SCOPE, provider: 'other' })).toThrow(/sessionCookie/);
    expect(() => openSecrets({ password: sealed.sessionCookie }, SCOPE)).toThrow(/password/);
  });

  it('uses a fresh IV per value, so equal secrets do not produce equal ciphertexts', () => {
    const sealed = sealSecrets({ a: 'same', b: 'same' }, SCOPE);
    expect(sealed.a).not.toBe(sealed.b);
  });

  it('leaves out empty values instead of storing them', () => {
    expect(sealSecrets({ sessionCookie: '_session=abc', password: '' }, SCOPE)).not.toHaveProperty('password');
  });

  it('ignores empty or non-string stored values when opening', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc' }, SCOPE);
    expect(openSecrets({ ...sealed, password: '', junk: 42, nothing: null }, SCOPE)).toEqual({
      sessionCookie: '_session=abc',
    });
  });

  it('fails, naming the secret but not its value, when a value cannot be decrypted', () => {
    expect(() => openSecrets({ sessionCookie: 'not-a-ciphertext' }, SCOPE)).toThrow(/sessionCookie/);
    expect(() => openSecrets({ sessionCookie: 'not-a-ciphertext' }, SCOPE)).not.toThrow(/not-a-ciphertext/);
  });

  it('treats a missing or malformed secrets column as no secrets', () => {
    expect(openSecrets(null, SCOPE)).toEqual({});
    expect(openSecrets('oops', SCOPE)).toEqual({});
    expect(openSecrets([], SCOPE)).toEqual({});
  });

  it('reports freshly sealed secrets as current and old-format ones as needing a re-seal', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc' }, SCOPE);

    expect(secretsNeedReseal(sealed)).toBe(false);
    expect(secretsNeedReseal({ sessionCookie: 'aa:bb:cc' })).toBe(true);
    expect(secretsNeedReseal({})).toBe(false);
  });
});
