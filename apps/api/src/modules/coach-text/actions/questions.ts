/**
 * Coach text commands: what a numbered question remembers.
 *
 * The question keeps exactly what the coach was offered, so the answer acts on
 * what they saw and no second camera lookup happens. Its `context` is read back
 * with these schemas; a question that does not parse is treated as no question.
 */

import { z } from 'zod';

import type { Intent } from '../interfaces';

export const PICK_ACCOUNT = 'pick_account';
export const PICK_GAME = 'pick_game';
export const PICK_STREAM = 'pick_stream';

export const IntentSchema: z.ZodType<Intent> = z.discriminatedUnion('action', [
  z.object({ action: z.literal('menu') }),
  z.object({ action: z.literal('live') }),
  z.object({ action: z.literal('games') }),
  z.object({ action: z.literal('attach'), offerNewPage: z.boolean() }),
  z.object({ action: z.literal('undo') }),
  z.object({ action: z.literal('unlink') }),
]);

/** A pick_account question asked before a command: the command to run after the answer. */
export const AccountContextSchema = z.object({ command: IntentSchema });
export type AccountContext = z.infer<typeof AccountContextSchema>;

/** A stream as it was offered. */
export const StreamChoiceSchema = z.object({
  title: z.string().max(300),
  /** The provider's display name, e.g. Veo. */
  provider: z.string().max(60),
  startedAt: z.string().datetime().nullable(),
  streamUrl: z.string().url().max(2048),
});
export type StreamChoice = z.infer<typeof StreamChoiceSchema>;

/** A pick_game or pick_stream question. */
export const AttachContextSchema = z.object({
  /** The phone's link to the account the question is for. */
  linkId: z.string().uuid(),
  /** The streams offered or to offer next. */
  streams: z.array(StreamChoiceSchema).min(1).max(9),
  /** pick_stream: the game the stream goes on. */
  eventId: z.string().uuid().optional(),
  /** pick_stream: that game's title, for the reply. */
  gameTitle: z.string().max(300).optional(),
});
export type AttachContext = z.infer<typeof AttachContextSchema>;
