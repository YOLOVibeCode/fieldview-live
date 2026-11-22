/**
 * Coach Text Command Schemas ("Text commands" in the owner portal)
 *
 * Shared by the API (apps/api/src/modules/coach-text, routes/owners.text-commands.ts)
 * and the web page (/owners/text-commands).
 */

import { z } from 'zod';

/**
 * A login lists several phones; each phone row is in one of these states.
 * pending = added in the portal, its LINK text not yet arrived (the code may have run out).
 */
export const COACH_TEXT_PHONE_STATES = ['pending', 'linked', 'paused', 'expired'] as const;

export type CoachTextPhoneState = (typeof COACH_TEXT_PHONE_STATES)[number];

/** Phones one login can add (its own and its helpers'). */
export const COACH_TEXT_MAX_PHONES_PER_LOGIN = 10;

/** Accounts one phone can work with: a question offers them as the digits 1 to 9. */
export const COACH_TEXT_MAX_ACCOUNTS_PER_PHONE = 9;

/** A name with no control characters (no line breaks), as shown in the portal and in emails. */
const NO_CONTROL_CHARACTERS = /^[^\p{Cc}]+$/u;

const TIME_ZONE_NAME = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/;

/** True when this runtime knows the IANA time zone name, for example America/Chicago. */
export function isIanaTimeZone(value: string): boolean {
  if (!value || value.length > 64 || !TIME_ZONE_NAME.test(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const zTimeZone = z.string().min(1).max(64).refine(isIanaTimeZone, 'Unknown time zone');

/** POST /api/owners/me/text-commands/phones: a phone for the person named, e.g. Jordan. */
export const AddCoachTextPhoneSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(40, 'Name is too long')
    .regex(NO_CONTROL_CHARACTERS, 'Name has characters that cannot be shown'),
  phone: z.string().min(1, 'Phone number is required').max(32, 'Phone number is too long'),
  /** The browser's zone. Used only while the login has not picked one. */
  timeZone: zTimeZone.optional(),
});

/** PATCH /api/owners/me/text-commands */
export const UpdateCoachTextSettingsSchema = z.object({
  timeZone: zTimeZone,
});

/** GET /api/owners/me/text-commands/history */
export const CoachTextHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const CoachTextCommandHelpSchema = z.object({
  word: z.string().min(1).max(20),
  description: z.string().min(1).max(200),
});

/** One phone on the login's list. */
export const CoachTextPhoneStatusSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  phoneMasked: z.string(),
  state: z.enum(COACH_TEXT_PHONE_STATES),
  codeExpiresAt: z.string().datetime().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  lastCommandAt: z.string().datetime().nullable(),
  /** A text from this number arrived but could not be proven to come from it. */
  unverifiedTextSeen: z.boolean(),
});

/** GET /api/owners/me/text-commands (also the answer to the PATCH). */
export const CoachTextStatusSchema = z.object({
  enabled: z.boolean(),
  productNumber: z.string(),
  timeZone: z.string(),
  maxPhones: z.number().int().positive(),
  phones: z.array(CoachTextPhoneStatusSchema),
  commands: z.array(CoachTextCommandHelpSchema),
});

/**
 * Answer to POST /api/owners/me/text-commands/phones and to …/phones/:id/code.
 * The code is returned this once.
 */
export const CoachTextPhoneCodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
  codeExpiresAt: z.string().datetime(),
  productNumber: z.string(),
  smsHref: z.string(),
});

export const CoachTextHistoryItemSchema = z.object({
  createdAt: z.string().datetime(),
  body: z.string(),
  status: z.string(),
  replyText: z.string().nullable(),
  /** The name of the phone that sent the text, as it was then. */
  phoneLabel: z.string().nullable(),
});

export const CoachTextHistorySchema = z.object({
  items: z.array(CoachTextHistoryItemSchema),
});

/**
 * The one open question stored for a phone (CoachTextPhone.pendingQuestion).
 * It records exactly what the coach was offered, so a digit answer acts on what they saw.
 * Option 0 is never stored: it always means "none of these".
 */
export const CoachTextQuestionOptionSchema = z.object({
  n: z.number().int().min(1).max(9),
  label: z.string().min(1).max(160),
  /** For kind 'pick_account': the phone's link to that account. */
  linkId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  streamUrl: z.string().url().optional(),
  directStreamId: z.string().uuid().optional(),
  create: z.boolean().optional(),
});

export const CoachTextQuestionSchema = z.object({
  v: z.literal(1),
  kind: z.string().min(1).max(40),
  options: z.array(CoachTextQuestionOptionSchema).min(1).max(9),
  context: z.record(z.unknown()).optional(),
});

export type AddCoachTextPhone = z.infer<typeof AddCoachTextPhoneSchema>;
export type UpdateCoachTextSettings = z.infer<typeof UpdateCoachTextSettingsSchema>;
export type CoachTextHistoryQuery = z.infer<typeof CoachTextHistoryQuerySchema>;
export type CoachTextCommandHelp = z.infer<typeof CoachTextCommandHelpSchema>;
export type CoachTextPhoneStatus = z.infer<typeof CoachTextPhoneStatusSchema>;
export type CoachTextStatus = z.infer<typeof CoachTextStatusSchema>;
export type CoachTextPhoneCode = z.infer<typeof CoachTextPhoneCodeSchema>;
export type CoachTextHistoryItem = z.infer<typeof CoachTextHistoryItemSchema>;
export type CoachTextHistory = z.infer<typeof CoachTextHistorySchema>;
export type CoachTextQuestionOption = z.infer<typeof CoachTextQuestionOptionSchema>;
export type CoachTextQuestion = z.infer<typeof CoachTextQuestionSchema>;
