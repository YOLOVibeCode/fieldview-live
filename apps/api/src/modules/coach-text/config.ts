/**
 * Coach text commands: settings.
 *
 * Every setting is optional and is read when it is used, so a change to the
 * environment needs no code change and a test can set it per case.
 *
 *   COACH_TEXT_ENABLED             the switch. Off unless `true` or `1`.
 *   COACH_TEXT_OWNER_ALLOWLIST     owner account ids, comma separated. Empty
 *                                  means every owner account.
 *   COACH_TEXT_DEFAULT_TIME_ZONE   used until a coach picks one.
 *   COACH_TEXT_NUMBER_E164         the number coaches text.
 *   COACH_TEXT_CODE_TTL_SECONDS    how long a link code lasts.
 *   COACH_TEXT_LINK_IDLE_DAYS      days without a text before a link expires.
 */

import { SMS_PRODUCT_NUMBER_E164, isIanaTimeZone } from '@fieldview/data-model';

/** Wrong codes a pending phone may text before its code stops working. */
export const MAX_CODE_ATTEMPTS = 5;

/** Unverified texts noted in the log per phone, per hour. */
export const MAX_UNVERIFIED_NOTES_PER_HOUR = 5;

const FALLBACK_TIME_ZONE = 'America/Chicago';
const DEFAULT_CODE_TTL_SECONDS = 600;
const DEFAULT_LINK_IDLE_DAYS = 90;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number((raw ?? '').trim());
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function isCoachTextEnabled(): boolean {
  const raw = (process.env.COACH_TEXT_ENABLED ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

/** With an empty allowlist every owner account is allowed. */
export function isOwnerAllowed(ownerAccountId: string): boolean {
  const allowed = (process.env.COACH_TEXT_OWNER_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return allowed.length === 0 || allowed.includes(ownerAccountId.toLowerCase());
}

/** The switch is on and this owner account may use the feature. */
export function isCoachTextEnabledFor(ownerAccountId: string): boolean {
  return isCoachTextEnabled() && isOwnerAllowed(ownerAccountId);
}

export function coachTextNumber(): string {
  const raw = (process.env.COACH_TEXT_NUMBER_E164 ?? '').trim();
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : SMS_PRODUCT_NUMBER_E164;
}

export function defaultTimeZone(): string {
  const raw = (process.env.COACH_TEXT_DEFAULT_TIME_ZONE ?? '').trim();
  return raw && isIanaTimeZone(raw) ? raw : FALLBACK_TIME_ZONE;
}

export function codeTtlSeconds(): number {
  return positiveInt(process.env.COACH_TEXT_CODE_TTL_SECONDS, DEFAULT_CODE_TTL_SECONDS);
}

export function linkIdleDays(): number {
  return positiveInt(process.env.COACH_TEXT_LINK_IDLE_DAYS, DEFAULT_LINK_IDLE_DAYS);
}
