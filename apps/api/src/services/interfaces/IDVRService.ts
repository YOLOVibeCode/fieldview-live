/**
 * DVR Service Interface
 * 
 * Orchestrates DVR provider operations + clip/bookmark repository
 * Following ISP: Single focused interface for DVR operations
 */

import { VideoClip, VideoBookmark } from '@prisma/client';

// ========================================
// Input Types
// ========================================

export interface CreateClipFromRecordingInput {
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  providerName: 'mock' | 'mux' | 'cloudflare';
  recordingId: string;
  title: string;
  description?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  isPublic?: boolean;
  createdById?: string;
  createdByType?: 'viewer' | 'admin' | 'system';
}

export interface CreateClipFromBookmarkInput {
  bookmarkId: string;
  title?: string; // Defaults to bookmark label
  description?: string;
  bufferSeconds?: number; // Extra seconds before/after bookmark (default: 5)
  isPublic?: boolean;
}

export interface CreateBookmarkInput {
  gameId?: string;
  directStreamId?: string;
  viewerIdentityId?: string;
  timestampSeconds: number;
  label: string;
  notes?: string;
  isShared?: boolean;
  bufferSeconds?: number;
}

export interface ListClipsOptions {
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  publicOnly?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'viewCount' | 'shareCount';
  orderDirection?: 'asc' | 'desc';
}

export interface ListBookmarksOptions {
  viewerId?: string;
  gameId?: string;
  directStreamId?: string;
  publicOnly?: boolean;
  includeShared?: boolean;
  limit?: number;
  offset?: number;
}

// ========================================
// IDVRService - Main DVR Operations
// ========================================

export interface IDVRService {
  // ========================================
  // Clip Operations
  // ========================================

  /**
   * Create clip from recording
   * 1. Call provider to create clip
   * 2. Store clip metadata in DB
   * 3. Return clip entity
   */
  createClipFromRecording(input: CreateClipFromRecordingInput): Promise<VideoClip>;

  /**
   * Create clip from bookmark
   * 1. Get bookmark details
   * 2. Calculate clip window (bookmark ± buffer)
   * 3. Create clip via provider
   * 4. Link bookmark to clip
   */
  createClipFromBookmark(input: CreateClipFromBookmarkInput): Promise<VideoClip>;

  /**
   * Get clip by ID
   */
  getClip(clipId: string): Promise<VideoClip | null>;

  /**
   * List clips with filters
   */
  listClips(options: ListClipsOptions): Promise<VideoClip[]>;

  /**
   * Delete clip
   * 1. Delete from provider
   * 2. Delete from DB
   */
  deleteClip(clipId: string): Promise<void>;

  /**
   * Track clip view (increment counter)
   */
  trackClipView(clipId: string): Promise<void>;

  /**
   * Track clip share (increment counter)
   */
  trackClipShare(clipId: string): Promise<void>;

  /**
   * Clean up expired clips
   * 1. Find expired clips in DB
   * 2. Delete from provider
   * 3. Delete from DB
   */
  cleanupExpiredClips(): Promise<number>;

  // ========================================
  // Bookmark Operations
  // ========================================

  /**
   * Create bookmark
   */
  createBookmark(input: CreateBookmarkInput): Promise<VideoBookmark>;

  /**
   * Get bookmark by ID
   */
  getBookmark(bookmarkId: string): Promise<VideoBookmark | null>;

  /**
   * List bookmarks with filters
   */
  listBookmarks(options: ListBookmarksOptions): Promise<VideoBookmark[]>;

  /**
   * Delete bookmark
   */
  deleteBookmark(bookmarkId: string): Promise<void>;

  /**
   * Update bookmark
   */
  updateBookmark(
    bookmarkId: string,
    updates: { label?: string; notes?: string; isShared?: boolean }
  ): Promise<VideoBookmark>;

  // ========================================
  // Recording Operations
  // ========================================

  /**
   * Start recording for a stream
   * Delegates to provider's startRecording
   */
  startRecording(streamKey: string, metadata?: Record<string, string>): Promise<{
    recordingId: string;
    status: string;
  }>;

  /**
   * Stop recording for a stream
   * Delegates to provider's stopRecording
   */
  stopRecording(recordingId: string): Promise<void>;

  /**
   * Get recording status
   * Delegates to provider's getRecordingStatus
   */
  getRecordingStatus(recordingId: string): Promise<{
    status: string;
    durationSeconds: number;
    sizeBytes: number;
  }>;
}

