/**
 * DVR API Schemas
 * 
 * Zod validation schemas for DVR API endpoints
 */

import { z } from 'zod';

// ========================================
// Clip Schemas
// ========================================

export const createClipSchema = z.object({
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  directStreamSlug: z.string().optional(),
  providerName: z.enum(['mock', 'mux', 'cloudflare']),
  recordingId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTimeSeconds: z.number().int().min(0),
  endTimeSeconds: z.number().int().min(0),
  isPublic: z.boolean().optional(),
});

export const createClipFromBookmarkSchema = z.object({
  bookmarkId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  bufferSeconds: z.number().int().min(0).max(60).optional(),
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

export const createBookmarkSchema = z.object({
  gameId: z.string().uuid().optional(),
  directStreamId: z.string().uuid().optional(),
  viewerIdentityId: z.string().uuid(),
  timestampSeconds: z.number().int().min(0),
  label: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  isShared: z.boolean().optional(),
});

export const updateBookmarkSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
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

