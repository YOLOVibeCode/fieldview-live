/**
 * Camera source secrets at rest.
 *
 * Stored as { name: ciphertext }; every value is sealed with the app's AES-256-GCM
 * helper (lib/encryption). Errors name the secret, never its value.
 */

import { decrypt, encrypt } from '../../lib/encryption';

/** Encrypt each secret for storage. Empty values are left out. */
export function sealSecrets(secrets: Record<string, string>): Record<string, string> {
  const sealed: Record<string, string> = {};
  for (const [name, value] of Object.entries(secrets)) {
    if (value) sealed[name] = encrypt(value);
  }
  return sealed;
}

/** Decrypt a stored secrets column. Empty or non-string entries are ignored. */
export function openSecrets(sealed: unknown): Record<string, string> {
  if (!sealed || typeof sealed !== 'object' || Array.isArray(sealed)) return {};

  const opened: Record<string, string> = {};
  for (const [name, value] of Object.entries(sealed as Record<string, unknown>)) {
    if (typeof value !== 'string' || !value) continue;
    try {
      opened[name] = decrypt(value);
    } catch {
      // Deliberately drop the cause: it can echo ciphertext or key details.
      throw new Error(`Could not decrypt camera source secret "${name}"`);
    }
  }
  return opened;
}
