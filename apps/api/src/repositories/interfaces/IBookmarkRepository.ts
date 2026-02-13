/**
 * Bookmark Repository Interfaces
 * 
 * Following Interface Segregation Principle (ISP):
 * - IBookmarkReader: Read-only operations
 * - IBookmarkWriter: Write operations
 */

import { VideoBookmark } from '@prisma/client';

// ========================================
// Input Types
// ========================================

export interface CreateBookmarkInput {
  gameId?: string;
  directStreamId?: string;
  clipId?: string;
  viewerIdentityId?: string;
  timestampSeconds: number;
  label: string;
  notes?: string;
  isShared?: boolean;
  bufferSeconds?: number;
}

export interface UpdateBookmarkInput {
  label?: string;
  notes?: string;
  isShared?: boolean;
  clipId?: string; // Can link to generated clip
}

export interface BookmarkListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'timestampSeconds';
  orderDirection?: 'asc' | 'desc';
}

// ========================================
// IBookmarkReader - Read-only operations
// ========================================

export interface IBookmarkReader {
  /**
   * Get bookmark by ID
   */
  getById(id: string): Promise<VideoBookmark | null>;

  /**
   * List bookmarks by viewer
   */
  listByViewer(viewerId: string, options?: BookmarkListOptions): Promise<VideoBookmark[]>;

  /**
   * List bookmarks by game
   */
  listByGame(gameId: string, options?: BookmarkListOptions, publicOnly?: boolean): Promise<VideoBookmark[]>;

  /**
   * List bookmarks by stream
   */
  listByStream(streamId: string, options?: BookmarkListOptions, publicOnly?: boolean): Promise<VideoBookmark[]>;

  /**
   * List own + shared bookmarks for a stream (combined query)
   */
  listByStreamWithShared(streamId: string, viewerId: string, options?: BookmarkListOptions): Promise<VideoBookmark[]>;

  /**
   * List bookmarks by clip
   */
  listByClip(clipId: string, options?: BookmarkListOptions): Promise<VideoBookmark[]>;

  /**
   * List public (shared) bookmarks
   */
  listPublic(options?: BookmarkListOptions): Promise<VideoBookmark[]>;

  /**
   * Count bookmarks by viewer
   */
  countByViewer(viewerId: string): Promise<number>;

  /**
   * Check if viewer has bookmarked a specific timestamp
   */
  existsForTimestamp(
    viewerId: string,
    gameOrStreamId: string,
    timestampSeconds: number
  ): Promise<boolean>;
}

// ========================================
// IBookmarkWriter - Write operations
// ========================================

export interface IBookmarkWriter {
  /**
   * Create new bookmark
   */
  create(data: CreateBookmarkInput): Promise<VideoBookmark>;

  /**
   * Update existing bookmark
   */
  update(id: string, data: UpdateBookmarkInput): Promise<VideoBookmark>;

  /**
   * Delete bookmark
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all bookmarks by viewer
   */
  deleteByViewer(viewerId: string): Promise<number>;

  /**
   * Link bookmark to generated clip
   */
  linkToClip(bookmarkId: string, clipId: string): Promise<VideoBookmark>;
}

