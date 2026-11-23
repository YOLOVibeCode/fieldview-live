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
 *   COACH_TEXT_QUESTION_TTL_SECONDS how long a numbered question waits for its answer.
 *   COACH_TEXT_ACCOUNT_CHOICE_HOURS how long a phone keeps the account it chose.
 *   COACH_TEXT_REPLY_BUDGET_MS     how long a text may take, from its arrival to
 *                                  the reply. The relay waits 15 seconds.
 *   APP_URL                        the public site, for page links in replies.
 */

import { SMS_PRODUCT_NUMBER_E164, isIanaTimeZone } from '@fieldview/data-model';

/** Wrong codes a pending phone may text before its code stops working. */
export const MAX_CODE_ATTEMPTS = 5;

/** Unverified texts noted in the log per phone, per hour. */
export const MAX_UNVERIFIED_NOTES_PER_HOUR = 5;

/** How long one text holds its phone, so a second text waits its turn. */
export const LEASE_MS = 20_000;

/** Time kept back from the reply budget for the write and the reply. */
export const WRITE_MARGIN_MS = 1_500;

/** How long a finished camera lookup is reused for the same account. */
export const LOOKUP_REUSE_MS = 15_000;

/** UNDO puts back a change made by text this recently. */
export const UNDO_WINDOW_MS = 30 * 60 * 1000;

const FALLBACK_TIME_ZONE = 'America/Chicago';
const DEFAULT_CODE_TTL_SECONDS = 600;
const DEFAULT_LINK_IDLE_DAYS = 90;
const DEFAULT_QUESTION_TTL_SECONDS = 600;
const DEFAULT_ACCOUNT_CHOICE_HOURS = 12;
const DEFAULT_REPLY_BUDGET_MS = 9_000;
const DEFAULT_APP_URL = 'https://fieldview.live';

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

export function questionTtlSeconds(): number {
  return positiveInt(process.env.COACH_TEXT_QUESTION_TTL_SECONDS, DEFAULT_QUESTION_TTL_SECONDS);
}

export function accountChoiceHours(): number {
  return positiveInt(process.env.COACH_TEXT_ACCOUNT_CHOICE_HOURS, DEFAULT_ACCOUNT_CHOICE_HOURS);
}

export function replyBudgetMs(): number {
  return positiveInt(process.env.COACH_TEXT_REPLY_BUDGET_MS, DEFAULT_REPLY_BUDGET_MS);
}

/** The public site, without a trailing slash. */
export function publicAppUrl(): string {
  const raw = (process.env.APP_URL ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s]+$/.test(raw) ? raw : DEFAULT_APP_URL;
}
