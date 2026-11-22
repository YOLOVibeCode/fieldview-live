/**
 * Coach text commands: the six-digit link code.
 *
 * The code is shown once in the portal and texted back by the coach. Only a
 * salted hash is stored. The code itself is never stored and never logged.
 */

import { createHash, randomInt, timingSafeEqual } from 'crypto';

const LINK_TEXT = /^LINK\s*[-:]?\s*(\d{6})$/i;

/** Six digits, leading zeros kept. */
export function generateLinkCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** SHA-256 of the code, salted with the id of the link row it belongs to. */
export function hashLinkCode(code: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

export function linkCodeMatches(code: string, salt: string, storedHash: string | null): boolean {
  if (!storedHash) {
    return false;
  }
  const actual = Buffer.from(hashLinkCode(code, salt), 'utf8');
  const expected = Buffer.from(storedHash, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The code in a `LINK 482913` text, or null when the text is anything else. */
export function parseLinkText(body: string): string | null {
  const match = LINK_TEXT.exec(body.trim());
  return match ? match[1] : null;
}

/** What the log keeps of a LINK text, so the code is never stored. */
export function maskLinkText(): string {
  return 'LINK ******';
}
