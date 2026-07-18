import { z } from 'zod';

/**
 * Schema for creating a new GameScoreboard
 */
export const CreateGameScoreboardSchema = z.object({
  directStreamId: z.string().uuid(),
  homeTeamName: z.string().min(1).max(100).default('Home'),
  awayTeamName: z.string().min(1).max(100).default('Away'),
  homeJerseyColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1E40AF'),
  awayJerseyColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#DC2626'),
  producerPassword: z.string().min(4).optional(), // Will be hashed
});

/**
 * Schema for updating scoreboard fields (partial)
 */
export const UpdateGameScoreboardSchema = z.object({
  homeTeamName: z.string().min(1).max(100).optional(),
  awayTeamName: z.string().min(1).max(100).optional(),
  homeJerseyColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  awayJerseyColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  homeScore: z.number().int().min(0).max(999).optional(),
  awayScore: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().optional(),
  position: z.enum(['top-left', 'top-center', 'top-right']).optional(),
  producerPassword: z.string().optional(), // For validation, not storage
  lastEditedBy: z.string().optional(), // Viewer name or "Admin"
});

/**
 * Schema for validating producer password
 */
export const ValidateProducerPasswordSchema = z.object({
  producerPassword: z.string().min(1),
});

/**
 * Schema for clock operations
 */
export const ClockOperationSchema = z.object({
  producerPassword: z.string().optional(), // For auth if password is set
});

/**
 * Public scoreboard response (what viewers see)
 */
export const ScoreboardResponseSchema = z.object({
  id: z.string().uuid(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  homeJerseyColor: z.string(),
  awayJerseyColor: z.string(),
  homeScore: z.number().int(),
  awayScore: z.number().int(),
  clockMode: z.enum(['stopped', 'running', 'paused']),
  clockSeconds: z.number().int(),
  clockStartedAt: z.string().nullable(), // ISO timestamp or null
  isVisible: z.boolean(),
  position: z.string(),
  requiresPassword: z.boolean(), // True if producerPassword is set
  lastEditedBy: z.string().nullable(),
  lastEditedAt: z.string().nullable(), // ISO timestamp or null
});

export type CreateGameScoreboard = z.infer<typeof CreateGameScoreboardSchema>;
export type UpdateGameScoreboard = z.infer<typeof UpdateGameScoreboardSchema>;
export type ValidateProducerPassword = z.infer<typeof ValidateProducerPasswordSchema>;
export type ClockOperation = z.infer<typeof ClockOperationSchema>;
export type ScoreboardResponse = z.infer<typeof ScoreboardResponseSchema>;

