/**
 * DVR API Schemas
 * 
 * Zod validation schemas for DVR API endpoints
 */

import { z } from 'zod';

// ========================================
// Clip Schemas
// ========================================

// Constants for clip validation
export const CLIP_LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  BUFFER_SECONDS_MIN: 0,
  BUFFER_SECONDS_MAX: 30, // 30 sec before + 30 sec after = 60 sec total clip
  MAX_CLIP_DURATION: 60,  // Maximum clip length in seconds
} as const;

export const createClipSchema = z.object({
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  directStreamSlug: z.string().optional(),
  providerName: z.enum(['mock', 'mux', 'cloudflare']),
  recordingId: z.string().min(1),
  title: z.string().min(1).max(CLIP_LIMITS.TITLE_MAX),
  description: z.string().max(CLIP_LIMITS.DESCRIPTION_MAX).optional(),
  startTimeSeconds: z.number().int().min(0),
  endTimeSeconds: z.number().int().min(0),
  isPublic: z.boolean().optional(),
}).refine(
  (data) => (data.endTimeSeconds - data.startTimeSeconds) <= CLIP_LIMITS.MAX_CLIP_DURATION,
  { message: `Clip duration must be ${CLIP_LIMITS.MAX_CLIP_DURATION} seconds or less` }
);

export const createClipFromBookmarkSchema = z.object({
  bookmarkId: z.string().uuid(),
  title: z.string().min(1).max(CLIP_LIMITS.TITLE_MAX).optional(),
  description: z.string().max(CLIP_LIMITS.DESCRIPTION_MAX).optional(),
  bufferSeconds: z.number()
    .int()
    .min(CLIP_LIMITS.BUFFER_SECONDS_MIN)
    .max(CLIP_LIMITS.BUFFER_SECONDS_MAX, `Buffer must be ${CLIP_LIMITS.BUFFER_SECONDS_MAX} seconds or less`)
    .optional()
    .default(5),
  isPublic: z.boolean().optional(),
});

export const listClipsSchema = z.object({
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  directStreamSlug: z.string().optional(),
  publicOnly: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
  orderBy: z.enum(['createdAt', 'viewCount', 'shareCount']).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
});

export const clipIdSchema = z.object({
  clipId: z.string().uuid(),
});

// ========================================
// Bookmark Schemas
// ========================================

// Constants for bookmark validation
export const BOOKMARK_LIMITS = {
  LABEL_MIN: 1,
  LABEL_MAX: 100,
  NOTES_MAX: 500,
  MAX_BOOKMARKS_PER_USER: 1000,
  MAX_TIMESTAMP_SECONDS: 86400, // 24 hours
} as const;

export const createBookmarkSchema = z.object({
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  viewerIdentityId: z.string().uuid(),
  timestampSeconds: z.number().int().min(0).max(BOOKMARK_LIMITS.MAX_TIMESTAMP_SECONDS),
  label: z.string()
    .trim()
    .min(BOOKMARK_LIMITS.LABEL_MIN, 'Label is required')
    .max(BOOKMARK_LIMITS.LABEL_MAX, `Label must be ${BOOKMARK_LIMITS.LABEL_MAX} characters or less`),
  notes: z.string()
    .trim()
    .max(BOOKMARK_LIMITS.NOTES_MAX, `Notes must be ${BOOKMARK_LIMITS.NOTES_MAX} characters or less`)
    .optional(),
  isShared: z.boolean().optional(),
}).refine(
  (data) => data.gameId || data.directStreamId,
  { message: 'Either gameId or directStreamId must be provided' }
);

export const updateBookmarkSchema = z.object({
  label: z.string()
    .trim()
    .min(BOOKMARK_LIMITS.LABEL_MIN, 'Label is required')
    .max(BOOKMARK_LIMITS.LABEL_MAX, `Label must be ${BOOKMARK_LIMITS.LABEL_MAX} characters or less`)
    .optional(),
  notes: z.string()
    .trim()
    .max(BOOKMARK_LIMITS.NOTES_MAX, `Notes must be ${BOOKMARK_LIMITS.NOTES_MAX} characters or less`)
    .optional(),
  isShared: z.boolean().optional(),
});

export const listBookmarksSchema = z.object({
  viewerId: z.string().uuid().optional(),
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  publicOnly: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

export const bookmarkIdSchema = z.object({
  bookmarkId: z.string().uuid(),
});

// ========================================
// Recording Schemas
// ========================================

export const startRecordingSchema = z.object({
  streamKey: z.string().min(1),
  metadata: z.record(z.string()).optional(),
});

export const recordingIdSchema = z.object({
  recordingId: z.string().min(1),
});

// ========================================
// Type Exports
// ========================================

export type CreateClipInput = z.infer<typeof createClipSchema>;
export type CreateClipFromBookmarkInput = z.infer<typeof createClipFromBookmarkSchema>;
export type ListClipsQuery = z.infer<typeof listClipsSchema>;
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
export type ListBookmarksQuery = z.infer<typeof listBookmarksSchema>;
export type StartRecordingInput = z.infer<typeof startRecordingSchema>;

