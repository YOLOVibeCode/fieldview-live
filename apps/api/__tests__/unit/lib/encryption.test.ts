/**
 * Encryption Module Unit Tests
 *
 * Verifies that secrets (camera source credentials; originally Square OAuth tokens)
 * are properly encrypted before storage.
 * Critical for security: tokens must never be stored in plaintext.
 */

import crypto from 'crypto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env
const originalEnv = process.env.ENCRYPTION_KEY;

describe('Encryption Module', () => {
  beforeEach(() => {
    // Reset module cache to pick up env changes
    vi.resetModules();
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32chars!';
  });

  afterEach(() => {
    // Restore original env
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt', () => {
    it('produces non-plaintext output', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const plaintext = 'sq0atp-secret-access-token-12345';

      const encrypted = encrypt(plaintext);

      // Encrypted output should NOT contain the plaintext
      expect(encrypted).not.toContain(plaintext);
      expect(encrypted).not.toContain('sq0atp');
      expect(encrypted).not.toContain('secret');
    });

    it('produces output in correct format (v2:keyId:iv:authTag:ciphertext)', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const plaintext = 'test-token';

      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      // Should have exactly 5 parts
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('v2');

      // Key id is a short fingerprint of the key (8 hex chars), never the key itself
      expect(parts[1]).toMatch(/^[0-9a-f]{8}$/);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32);
      expect(parts[2]).toMatch(/^[0-9a-f]+$/);

      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[3]).toHaveLength(32);
      expect(parts[3]).toMatch(/^[0-9a-f]+$/);

      // Ciphertext should be hex
      expect(parts[4]).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different output for same input (random IV)', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const plaintext = 'same-token';

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Same plaintext should produce different ciphertext (due to random IV)
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('throws error for empty string', async () => {
      const { encrypt } = await import('@/lib/encryption');

      expect(() => encrypt('')).toThrow('Cannot encrypt empty string');
    });
  });

  describe('decrypt', () => {
    it('decrypts encrypted value back to original', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const plaintext = 'test-fake-token-not-real';

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('correctly roundtrips Square OAuth tokens', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');

      const testTokens = [
        'FAKE-sq0atp-TestAccessToken-NotReal', // Access token format
        'FAKE-sq0atr-TestRefreshToken-NotReal', // Refresh token format
        'TEST-EAAAl3example_oauth_token_for_testing',
      ];

      for (const token of testTokens) {
        const encrypted = encrypt(token);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it('throws error for empty string', async () => {
      const { decrypt } = await import('@/lib/encryption');

      expect(() => decrypt('')).toThrow('Cannot decrypt empty string');
    });

    it('throws error for invalid ciphertext format', async () => {
      const { decrypt } = await import('@/lib/encryption');

      expect(() => decrypt('invalid-no-colons')).toThrow('Invalid ciphertext format');
      expect(() => decrypt('only:two:parts')).not.toThrow('Invalid ciphertext format');
    });

    it('throws error for tampered ciphertext (authentication failure)', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const plaintext = 'sensitive-data';

      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      // Tamper with the ciphertext
      const tamperedCiphertext = [...parts.slice(0, 4), 'ff'.repeat(parts[4]!.length / 2)].join(':');

      expect(() => decrypt(tamperedCiphertext)).toThrow();
    });
  });

  describe('Security properties', () => {
    it('uses AES-256-GCM (authenticated encryption)', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const plaintext = 'test';

      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      // GCM auth tag is 16 bytes = 32 hex chars
      expect(parts[3]).toHaveLength(32);

      // Verify tampering the auth tag causes decryption to fail
      const tamperedAuthTag = [...parts.slice(0, 3), '00'.repeat(16), parts[4]].join(':');
      expect(() => decrypt(tamperedAuthTag)).toThrow();
    });

    it('different encryption keys produce different ciphertext', async () => {
      process.env.ENCRYPTION_KEY = 'key-one-for-testing-purposes-32!';
      vi.resetModules();
      const { encrypt: encrypt1 } = await import('@/lib/encryption');
      const encrypted1 = encrypt1('test-token');

      process.env.ENCRYPTION_KEY = 'key-two-for-testing-purposes-32!';
      vi.resetModules();
      const { encrypt: encrypt2 } = await import('@/lib/encryption');
      const encrypted2 = encrypt2('test-token');

      // Same plaintext with different keys should produce different ciphertext
      // (Actually the IV makes them different anyway, but the point is they're not decryptable with wrong key)
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('ciphertext encrypted with one key cannot be decrypted with another', async () => {
      process.env.ENCRYPTION_KEY = 'original-key-for-testing-32chars';
      vi.resetModules();
      const { encrypt } = await import('@/lib/encryption');
      const encrypted = encrypt('secret-token');

      // Change the key
      process.env.ENCRYPTION_KEY = 'different-key-for-testing-32char';
      vi.resetModules();
      const { decrypt } = await import('@/lib/encryption');

      // Should fail to decrypt with wrong key
      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe('Development fallback', () => {
    it('uses dev fallback key when ENCRYPTION_KEY is not set (non-production)', async () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'development';
      vi.resetModules();

      const { encrypt, decrypt } = await import('@/lib/encryption');

      // Should not throw, should use dev fallback
      const encrypted = encrypt('test');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('test');
    });
  });

  describe('Square token storage integration', () => {
    it('encrypted token is safe to store in database', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const accessToken = 'sq0atp-REAL_ACCESS_TOKEN_VALUE';

      const encrypted = encrypt(accessToken);

      // The encrypted value should be a safe string for database storage
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      // Should only contain the version tag, hex characters and colons (safe for any DB)
      expect(encrypted).toMatch(/^v2:[0-9a-f:]+$/);

      // Should NOT contain the original token
      expect(encrypted).not.toContain('sq0atp');
      expect(encrypted).not.toContain('REAL_ACCESS_TOKEN_VALUE');
    });

    it('handles typical Square token lengths', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');

      // Square access tokens are typically ~50-100 characters
      const shortToken = 'sq0atp-short';
      const longToken = 'sq0atp-' + 'x'.repeat(100);

      expect(decrypt(encrypt(shortToken))).toBe(shortToken);
      expect(decrypt(encrypt(longToken))).toBe(longToken);
    });
  });

  /** The pre-v2 format: iv:authTag:ciphertext, key = scrypt(ENCRYPTION_KEY, 'fieldview-salt'), no context. */
  function legacyEncrypt(plaintext: string, keyMaterial: string): string {
    const key = crypto.scryptSync(keyMaterial, 'fieldview-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const body = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${body}`;
  }

  describe('Context binding', () => {
    it('round-trips a value bound to its context', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const sealed = encrypt('_session=abc', 'camera-source:owner-1:veo:sessionCookie');

      expect(sealed).not.toContain('_session=abc');
      expect(decrypt(sealed, 'camera-source:owner-1:veo:sessionCookie')).toBe('_session=abc');
    });

    it('refuses to open a value under a different context (moved to another owner or field)', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const sealed = encrypt('_session=abc', 'camera-source:owner-1:veo:sessionCookie');

      expect(() => decrypt(sealed, 'camera-source:owner-2:veo:sessionCookie')).toThrow();
      expect(() => decrypt(sealed, 'camera-source:owner-1:veo:password')).toThrow();
      expect(() => decrypt(sealed)).toThrow();
    });

    it('rejects an unknown format version', async () => {
      const { decrypt } = await import('@/lib/encryption');

      expect(() => decrypt('v9:a:b:c:d')).toThrow('Invalid ciphertext format');
    });
  });

  describe('Legacy values (written before context binding)', () => {
    const KEY = 'test-encryption-key-for-unit-tests-32chars!';

    it('still opens a legacy value, whatever context is asked for', async () => {
      const { decrypt } = await import('@/lib/encryption');
      const legacy = legacyEncrypt('_session=old', KEY);

      expect(decrypt(legacy, 'camera-source:owner-1:veo:sessionCookie')).toBe('_session=old');
      expect(decrypt(legacy)).toBe('_session=old');
    });

    it('flags a legacy value for re-sealing, and a current one as fine', async () => {
      const { encrypt, needsReseal } = await import('@/lib/encryption');

      expect(needsReseal(legacyEncrypt('x', KEY))).toBe(true);
      expect(needsReseal(encrypt('x', 'ctx'))).toBe(false);
    });
  });

  describe('Key rotation', () => {
    afterEach(() => {
      delete process.env.ENCRYPTION_KEY_PREVIOUS;
    });

    it('opens values sealed with the previous key and flags them for re-sealing', async () => {
      const { encrypt, decrypt, needsReseal } = await import('@/lib/encryption');
      process.env.ENCRYPTION_KEY = 'rotation-key-A';
      const sealedWithA = encrypt('secret', 'ctx');

      process.env.ENCRYPTION_KEY = 'rotation-key-B';
      process.env.ENCRYPTION_KEY_PREVIOUS = 'rotation-key-A';

      expect(decrypt(sealedWithA, 'ctx')).toBe('secret');
      expect(needsReseal(sealedWithA)).toBe(true);
      expect(needsReseal(encrypt('secret', 'ctx'))).toBe(false);
    });

    it('opens a legacy value sealed with the previous key', async () => {
      const { decrypt } = await import('@/lib/encryption');
      const legacy = legacyEncrypt('old', 'rotation-key-A');
      process.env.ENCRYPTION_KEY = 'rotation-key-B';
      process.env.ENCRYPTION_KEY_PREVIOUS = 'rotation-key-A';

      expect(decrypt(legacy)).toBe('old');
    });
  });

  describe('Deployed environments', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      delete process.env.RAILWAY_ENVIRONMENT;
      delete process.env.RAILWAY_ENVIRONMENT_NAME;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it.each(['RAILWAY_ENVIRONMENT', 'RAILWAY_ENVIRONMENT_NAME'])(
      'refuses the development key when ENCRYPTION_KEY is missing and %s is set',
      async (signal) => {
        delete process.env.ENCRYPTION_KEY;
        process.env.NODE_ENV = 'development';
        process.env[signal] = 'dev';
        vi.resetModules();
        const { encrypt } = await import('@/lib/encryption');

        expect(() => encrypt('x', 'ctx')).toThrow(/ENCRYPTION_KEY/);
      }
    );
  });
});
