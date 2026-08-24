import { z } from 'zod';
import { sportRegistry } from '../sports/registry';

function refineAgainstRegistry(
  data: { sportId: string; eventTypeId: string; team?: 'home' | 'away' },
  ctx: z.RefinementCtx
): void {
  let sport;
  try {
    sport = sportRegistry.getSport(data.sportId);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sportId'],
      message: `Unknown sport: "${data.sportId}"`,
    });
    return;
  }

  const eventType = sport.eventTypes.find((e) => e.id === data.eventTypeId);
  if (!eventType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventTypeId'],
      message: `Unknown event type "${data.eventTypeId}" for sport "${data.sportId}"`,
    });
    return;
  }

  if (eventType.teamScoped && data.team === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['team'],
      message: `"team" is required for event "${data.eventTypeId}" (it is team-scoped)`,
    });
  }
}

/**
 * Payload a viewer sends to report a game event.
 * Super-refined against the sport registry.
 */
export const ReportGameEventSchema = z
  .object({
    sportId: z.string().min(1),
    eventTypeId: z.string().min(1),
    team: z.enum(['home', 'away']).optional(),
    clockSeconds: z.number().int().min(0).optional(),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
    detail: z.string().min(1).optional(),
    detailValue: z.number().int().min(0).optional(),
    note: z.string().max(80).optional(),
    filmTimeSeconds: z.number().int().min(0).optional(),
  })
  .superRefine(refineAgainstRegistry);

/**
 * Body posted by a viewer. sportId is taken from the stream, not the client.
 */
export const ReportGameEventBodySchema = z.object({
  eventTypeId: z.string().min(1),
  team: z.enum(['home', 'away']).optional(),
  clockSeconds: z.number().int().min(0).optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  detail: z.string().min(1).optional(),
  detailValue: z.number().int().min(0).optional(),
  note: z.string().max(80).optional(),
  filmTimeSeconds: z.number().int().min(0).optional(),
});

export const ResolveGameEventSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  producerPassword: z.string().optional(),
});

export type ReportGameEvent = z.infer<typeof ReportGameEventSchema>;
export type ReportGameEventBody = z.infer<typeof ReportGameEventBodySchema>;
export type ResolveGameEvent = z.infer<typeof ResolveGameEventSchema>;

/**
 * Live SSE / chat-card payload for a crowdsourced game event.
 */
export const GameEventPayloadSchema = z.object({
  id: z.string().uuid(),
  sportId: z.string(),
  eventTypeId: z.string(),
  label: z.string(),
  icon: z.string(),
  category: z.enum(['scoring', 'period', 'hype']),
  team: z.enum(['home', 'away']).nullable(),
  status: z.enum(['pending', 'confirmed', 'rejected']),
  confirmationCount: z.number().int().min(0),
  confirmationNeeded: z.number().int().min(0),
  pointsDelta: z.number().int(),
  displayName: z.string(),
  reportedByViewerId: z.string(),
  chatMessageId: z.string().nullable(),
  createdAt: z.string(),
  // Narration fields
  narration: z.string().optional(),
  periodLabel: z.string().optional(),
  clockSeconds: z.number().int().min(0).nullable().optional(),
  jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
  detail: z.string().nullable().optional(),
  detailValue: z.number().int().min(0).nullable().optional(),
  note: z.string().max(80).nullable().optional(),
  filmTimeSeconds: z.number().int().min(0).nullable().optional(),
});

export type GameEventPayload = z.infer<typeof GameEventPayloadSchema>;

export const ResolvedGameEventSchema = z.object({
  sportId: z.string(),
  eventTypeId: z.string(),
  team: z.enum(['home', 'away']).nullable(),
  clockSeconds: z.number().int().min(0).nullable(),
  pointsDelta: z.number().int().min(0),
  homeDelta: z.number().int().min(0),
  awayDelta: z.number().int().min(0),
  requiresConfirmation: z.boolean(),
  notifyWorthy: z.boolean(),
  advancesPeriod: z.boolean(),
});

export type ResolvedGameEvent = z.infer<typeof ResolvedGameEventSchema>;
