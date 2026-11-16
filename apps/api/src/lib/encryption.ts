/**
 * Encryption Utilities
 *
 * AES-256-GCM encryption for secrets at rest (camera source credentials).
 * Uses environment variable for encryption key.
 * Also includes bcrypt password hashing for admin/producer passwords.
 */

import crypto from 'crypto';

import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const BCRYPT_ROUNDS = 10;
const FORMAT_V2 = 'v2';

if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY environment variable is required in production');
}

interface Key {
  /** Short fingerprint stored with each value, so a rotated key can be told from the current one. */
  id: string;
  bytes: Buffer;
}

const derivedKeys = new Map<string, Key>();

/** scrypt is deliberately slow, so derive each key once per process. */
function deriveKey(material: string, salt: string): Key {
  const cacheKey = `${salt}\u0000${material}`;
  let key = derivedKeys.get(cacheKey);
  if (!key) {
    const bytes = crypto.scryptSync(material, salt, 32);
    key = { id: crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8), bytes };
    derivedKeys.set(cacheKey, key);
  }
  return key;
}

/** True on any deployed environment, where the hard-coded development key must never be used. */
function isDeployed(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    !!process.env.RAILWAY_ENVIRONMENT ||
    !!process.env.RAILWAY_ENVIRONMENT_NAME
  );
}

function currentKey(): Key {
  const material = process.env.ENCRYPTION_KEY;
  if (material) return deriveKey(material, 'fieldview-salt');
  if (isDeployed()) {
    throw new Error('ENCRYPTION_KEY is required in every deployed environment');
  }
  // Development fallback (not secure, only for local dev)
  return deriveKey('dev-key-change-in-production', 'salt');
}

/** Keys that may open existing values: the current one, then the one it replaced. */
function candidateKeys(): Key[] {
  const keys = [currentKey()];
  const previous = process.env.ENCRYPTION_KEY_PREVIOUS;
  if (previous) keys.push(deriveKey(previous, 'fieldview-salt'));
  return keys;
}

function open(key: Key, ivHex: string, authTagHex: string, encrypted: string, context?: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key.bytes, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  if (context !== undefined) decipher.setAAD(Buffer.from(context, 'utf8'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

/**
 * Encrypt sensitive data. `context` names where the value lives (e.g. owner + field);
 * the value can then only be opened under that same context, so a ciphertext copied
 * to another row or field is useless.
 */
export function encrypt(plaintext: string, context?: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = currentKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key.bytes, iv);
  cipher.setAAD(Buffer.from(context ?? '', 'utf8'));

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Format: v2:keyId:iv:authTag:encrypted (all hex)
  return [FORMAT_V2, key.id, iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted].join(':');
}

/**
 * Decrypt sensitive data. Values written before context binding (iv:authTag:encrypted)
 * still open, with no context check; `needsReseal` reports them so they get upgraded.
 */
export function decrypt(ciphertext: string, context?: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string');
  }

  const parts = ciphertext.split(':');

  if (parts[0] === FORMAT_V2 && parts.length === 5) {
    const [, keyId, ivHex, authTagHex, encrypted] = parts;
    const key = candidateKeys().find((k) => k.id === keyId);
    if (!key) {
      throw new Error('No encryption key available for this value');
    }
    return open(key, ivHex, authTagHex, encrypted, context ?? '');
  }

  if (parts.length === 3 && parts.every((part) => part.length > 0)) {
    const [ivHex, authTagHex, encrypted] = parts;
    const keys = candidateKeys();
    for (const [i, key] of keys.entries()) {
      try {
        return open(key, ivHex, authTagHex, encrypted);
      } catch (err) {
        if (i === keys.length - 1) throw err;
      }
    }
  }

  throw new Error('Invalid ciphertext format');
}

/** True when a stored value should be re-encrypted: legacy format, or not sealed with the current key. */
export function needsReseal(ciphertext: string): boolean {
  const parts = ciphertext.split(':');
  if (parts[0] !== FORMAT_V2 || parts.length !== 5) return true;
  return parts[1] !== currentKey().id;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password with a hashed password
 */
export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

