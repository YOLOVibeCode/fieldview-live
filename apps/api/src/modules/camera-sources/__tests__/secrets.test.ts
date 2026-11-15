import { describe, it, expect } from 'vitest';

import { openSecrets, sealSecrets } from '../secrets';

describe('camera source secrets', () => {
  it('encrypts every value and decrypts it back', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc', password: 'p$ss' });

    expect(Object.keys(sealed).sort()).toEqual(['password', 'sessionCookie']);
    expect(sealed.sessionCookie).not.toContain('_session=abc');
    expect(sealed.password).not.toContain('p$ss');
    expect(openSecrets(sealed)).toEqual({ sessionCookie: '_session=abc', password: 'p$ss' });
  });

  it('uses a fresh IV per value, so equal secrets do not produce equal ciphertexts', () => {
    const sealed = sealSecrets({ a: 'same', b: 'same' });
    expect(sealed.a).not.toBe(sealed.b);
  });

  it('leaves out empty values instead of storing them', () => {
    expect(sealSecrets({ sessionCookie: '_session=abc', password: '' })).not.toHaveProperty('password');
  });

  it('ignores empty or non-string stored values when opening', () => {
    const sealed = sealSecrets({ sessionCookie: '_session=abc' });
    expect(openSecrets({ ...sealed, password: '', junk: 42, nothing: null })).toEqual({
      sessionCookie: '_session=abc',
    });
  });

  it('fails, naming the secret but not its value, when a value cannot be decrypted', () => {
    expect(() => openSecrets({ sessionCookie: 'not-a-ciphertext' })).toThrow(/sessionCookie/);
    expect(() => openSecrets({ sessionCookie: 'not-a-ciphertext' })).not.toThrow(/not-a-ciphertext/);
  });

  it('treats a missing or malformed secrets column as no secrets', () => {
    expect(openSecrets(null)).toEqual({});
    expect(openSecrets('oops')).toEqual({});
    expect(openSecrets([])).toEqual({});
  });
});
