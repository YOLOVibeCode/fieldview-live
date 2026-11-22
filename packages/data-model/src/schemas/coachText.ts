/**
 * Coach Text Command Schemas ("Text commands" in the owner portal)
 *
 * Shared by the API (apps/api/src/modules/coach-text, routes/owners.text-commands.ts)
 * and the web page (/owners/text-commands).
 */

import { z } from 'zod';

export const COACH_TEXT_LINK_STATES = ['none', 'pending', 'linked', 'paused', 'expired'] as const;

export type CoachTextLinkState = (typeof COACH_TEXT_LINK_STATES)[number];

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

/** POST /api/owners/me/text-commands/link */
export const StartCoachTextLinkSchema = z.object({
  phone: z.string().min(1, 'Phone number is required').max(32, 'Phone number is too long'),
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

/** GET /api/owners/me/text-commands (also the answer to the PATCH). */
export const CoachTextStatusSchema = z.object({
  enabled: z.boolean(),
  state: z.enum(COACH_TEXT_LINK_STATES),
  productNumber: z.string(),
  phoneMasked: z.string().nullable(),
  pendingPhoneMasked: z.string().nullable(),
  codeExpiresAt: z.string().datetime().nullable(),
  unverifiedTextSeen: z.boolean(),
  verifiedAt: z.string().datetime().nullable(),
  lastCommandAt: z.string().datetime().nullable(),
  timeZone: z.string(),
  commands: z.array(CoachTextCommandHelpSchema),
});

/** Answer to POST /api/owners/me/text-commands/link. The code is returned this once. */
export const CoachTextLinkStartedSchema = z.object({
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
});

export const CoachTextHistorySchema = z.object({
  items: z.array(CoachTextHistoryItemSchema),
});

/**
 * The one open question stored on a link (CoachTextLink.pendingQuestion).
 * It records exactly what the coach was offered, so a digit answer acts on what they saw.
 * Option 0 is never stored: it always means "none of these".
 */
export const CoachTextQuestionOptionSchema = z.object({
  n: z.number().int().min(1).max(9),
  label: z.string().min(1).max(160),
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

export type StartCoachTextLink = z.infer<typeof StartCoachTextLinkSchema>;
export type UpdateCoachTextSettings = z.infer<typeof UpdateCoachTextSettingsSchema>;
export type CoachTextHistoryQuery = z.infer<typeof CoachTextHistoryQuerySchema>;
export type CoachTextCommandHelp = z.infer<typeof CoachTextCommandHelpSchema>;
export type CoachTextStatus = z.infer<typeof CoachTextStatusSchema>;
export type CoachTextLinkStarted = z.infer<typeof CoachTextLinkStartedSchema>;
export type CoachTextHistoryItem = z.infer<typeof CoachTextHistoryItemSchema>;
export type CoachTextHistory = z.infer<typeof CoachTextHistorySchema>;
export type CoachTextQuestionOption = z.infer<typeof CoachTextQuestionOptionSchema>;
export type CoachTextQuestion = z.infer<typeof CoachTextQuestionSchema>;
