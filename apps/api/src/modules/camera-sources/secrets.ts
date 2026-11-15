/**
 * Camera source secrets at rest.
 *
 * Stored as { name: ciphertext }. Every value is sealed with the app's AES-256-GCM
 * helper (lib/encryption) and bound to its owner, provider and field name, so a
 * ciphertext copied to another owner's row or another field cannot be opened.
 * Errors name the secret, never its value.
 */

import { decrypt, encrypt, needsReseal } from '../../lib/encryption';

/** Which camera source a secret belongs to; part of what it is encrypted against. */
export interface SecretScope {
  ownerAccountId: string;
  provider: string;
}

function contextFor(scope: SecretScope, name: string): string {
  return `camera-source:${scope.ownerAccountId}:${scope.provider}:${name}`;
}

function entries(sealed: unknown): Array<[string, string]> {
  if (!sealed || typeof sealed !== 'object' || Array.isArray(sealed)) return [];
  return Object.entries(sealed as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
  );
}

/** Encrypt each secret for storage. Empty values are left out. */
export function sealSecrets(secrets: Record<string, string>, scope: SecretScope): Record<string, string> {
  const sealed: Record<string, string> = {};
  for (const [name, value] of Object.entries(secrets)) {
    if (value) sealed[name] = encrypt(value, contextFor(scope, name));
  }
  return sealed;
}

/** Decrypt a stored secrets column. Empty or non-string entries are ignored. */
export function openSecrets(sealed: unknown, scope: SecretScope): Record<string, string> {
  const opened: Record<string, string> = {};
  for (const [name, value] of entries(sealed)) {
    try {
      opened[name] = decrypt(value, contextFor(scope, name));
    } catch {
      // Deliberately drop the cause: it can echo ciphertext or key details.
      throw new Error(`Could not decrypt camera source secret "${name}"`);
    }
  }
  return opened;
}

/** True when any stored value predates context binding or the current key, and should be re-sealed. */
export function secretsNeedReseal(sealed: unknown): boolean {
  return entries(sealed).some(([, value]) => needsReseal(value));
}
