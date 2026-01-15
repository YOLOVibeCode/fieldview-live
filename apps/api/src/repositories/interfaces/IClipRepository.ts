/**
 * Clip Repository Interfaces
 * 
 * Following Interface Segregation Principle (ISP):
 * - IClipReader: Read-only operations
 * - IClipWriter: Write operations
 * - Clients depend only on what they need
 */

import { VideoClip } from '@prisma/client';

// ========================================
// Input Types
// ========================================

export interface CreateClipInput {
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  providerName: 'mock' | 'mux' | 'cloudflare';
  providerClipId: string;
  providerRecordingId?: string;
  title: string;
  description?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  playbackUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'ready' | 'failed';
  isPublic?: boolean;
  createdById?: string;
  createdByType?: 'viewer' | 'admin' | 'system';
  expiresAt?: Date;
}

export interface UpdateClipInput {
  title?: string;
  description?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  status?: 'pending' | 'ready' | 'failed';
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface ClipListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'viewCount' | 'shareCount';
  orderDirection?: 'asc' | 'desc';
}

// ========================================
// IClipReader - Read-only operations
// ========================================

export interface IClipReader {
  /**
   * Get clip by ID
   */
  getById(id: string): Promise<VideoClip | null>;

  /**
   * List all clips for a game
   */
  listByGame(gameId: string, options?: ClipListOptions): Promise<VideoClip[]>;

  /**
   * List all clips for a direct stream
   */
  listByStream(streamId: string, options?: ClipListOptions): Promise<VideoClip[]>;

  /**
   * List all clips for a direct stream slug
   */
  listByStreamSlug(slug: string, options?: ClipListOptions): Promise<VideoClip[]>;

  /**
   * List all public clips
   */
  listPublic(options?: ClipListOptions): Promise<VideoClip[]>;

  /**
   * Count clips by game
   */
  countByGame(gameId: string): Promise<number>;

  /**
   * Count clips by stream
   */
  countByStream(streamId: string): Promise<number>;

  /**
   * Get clip by provider info (for deduplication)
   */
  getByProvider(providerName: string, providerClipId: string): Promise<VideoClip | null>;
}

// ========================================
// IClipWriter - Write operations
// ========================================

export interface IClipWriter {
  /**
   * Create new clip
   */
  create(data: CreateClipInput): Promise<VideoClip>;

  /**
   * Update existing clip
   */
  update(id: string, data: UpdateClipInput): Promise<VideoClip>;

  /**
   * Delete clip
   */
  delete(id: string): Promise<void>;

  /**
   * Increment view count
   */
  incrementViewCount(id: string): Promise<void>;

  /**
   * Increment share count
   */
  incrementShareCount(id: string): Promise<void>;

  /**
   * Delete expired clips
   */
  deleteExpired(): Promise<number>;
}

