/**
 * DVRService
 * 
 * Orchestrates DVR provider operations with clip/bookmark repositories
 * Business logic layer between API routes and data layer
 */

import { VideoClip, VideoBookmark } from '@prisma/client';
import type {
  IDVRService as IDVRProvider,
  ClipMetadata,
} from '@fieldview/dvr-service';
import type { IClipReader, IClipWriter } from '../repositories/interfaces/IClipRepository';
import type { IBookmarkReader, IBookmarkWriter } from '../repositories/interfaces/IBookmarkRepository';
import type {
  IDVRService,
  CreateClipFromRecordingInput,
  CreateClipFromBookmarkInput,
  CreateBookmarkInput,
  ListClipsOptions,
  ListBookmarksOptions,
} from './interfaces/IDVRService';

export class DVRService implements IDVRService {
  constructor(
    private provider: IDVRProvider,
    private clipRepo: IClipReader & IClipWriter,
    private bookmarkRepo: IBookmarkReader & IBookmarkWriter
  ) {}

  // ========================================
  // Clip Operations
  // ========================================

  async createClipFromRecording(input: CreateClipFromRecordingInput): Promise<VideoClip> {
    // 1. Create clip via provider
    const providerClip = await this.provider.createClip(
      input.recordingId,
      {
        startSeconds: input.startTimeSeconds,
        endSeconds: input.endTimeSeconds,
      }
    );

    // 2. Get clip metadata from provider
    const metadata = await this.provider.getClipMetadata(providerClip.clipId);

    // 3. Generate playback URL (or use from creation result)
    const playbackUrl = providerClip.playbackUrl || metadata.playbackUrl;

    // 4. Store in database
    const clip = await this.clipRepo.create({
      gameId: input.gameId,
      directStreamId: input.directStreamId,
      directStreamSlug: input.directStreamSlug,
      providerName: input.providerName,
      providerClipId: providerClip.clipId,
      providerRecordingId: input.recordingId,
      title: input.title,
      description: input.description,
      startTimeSeconds: input.startTimeSeconds,
      endTimeSeconds: input.endTimeSeconds,
      durationSeconds: metadata.durationSeconds,
      playbackUrl,
      thumbnailUrl: providerClip.thumbnailUrl || metadata.thumbnailUrl,
      status: providerClip.status === 'ready' ? 'ready' : 'pending',
      isPublic: input.isPublic ?? false,
      createdById: input.createdById,
      createdByType: input.createdByType,
    });

    return clip;
  }

  async createClipFromBookmark(input: CreateClipFromBookmarkInput): Promise<VideoClip> {
    // 1. Get bookmark
    const bookmark = await this.bookmarkRepo.getById(input.bookmarkId);
    if (!bookmark) {
      throw new Error(`Bookmark not found: ${input.bookmarkId}`);
    }

    // 2. Calculate clip window
    const bufferSeconds = input.bufferSeconds ?? 5;
    const startTimeSeconds = Math.max(0, bookmark.timestampSeconds - bufferSeconds);
    const endTimeSeconds = bookmark.timestampSeconds + bufferSeconds;

    // 3. Determine recording context
    if (!bookmark.gameId && !bookmark.directStreamId) {
      throw new Error('Bookmark must be associated with a game or stream');
    }

    // For now, we'll need to get the recording ID from the game/stream
    // This assumes recordings are stored with the game/stream
    // In production, you'd fetch this from Game or DirectStream metadata
    const recordingId = `recording-${bookmark.gameId || bookmark.directStreamId}`;

    // 4. Create clip
    const clip = await this.createClipFromRecording({
      gameId: bookmark.gameId ?? undefined,
      directStreamId: bookmark.directStreamId ?? undefined,
      providerName: 'mock', // Would be determined from game/stream config
      recordingId,
      title: input.title || bookmark.label,
      description: input.description || bookmark.notes || undefined,
      startTimeSeconds,
      endTimeSeconds,
      isPublic: input.isPublic,
      createdById: bookmark.viewerIdentityId ?? undefined,
      createdByType: 'viewer',
    });

    // 5. Link bookmark to clip
    await this.bookmarkRepo.linkToClip(bookmark.id, clip.id);

    return clip;
  }

  async getClip(clipId: string): Promise<VideoClip | null> {
    return this.clipRepo.getById(clipId);
  }

  async listClips(options: ListClipsOptions): Promise<VideoClip[]> {
    if (options.gameId) {
      return this.clipRepo.listByGame(options.gameId, {
        limit: options.limit,
        offset: options.offset,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection,
      });
    }

    if (options.directStreamId) {
      return this.clipRepo.listByStream(options.directStreamId, {
        limit: options.limit,
        offset: options.offset,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection,
      });
    }

    if (options.directStreamSlug) {
      return this.clipRepo.listByStreamSlug(options.directStreamSlug, {
        limit: options.limit,
        offset: options.offset,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection,
      });
    }

    if (options.publicOnly) {
      return this.clipRepo.listPublic({
        limit: options.limit,
        offset: options.offset,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection,
      });
    }

    // Default: return public clips
    return this.clipRepo.listPublic({
      limit: options.limit,
      offset: options.offset,
      orderBy: options.orderBy,
      orderDirection: options.orderDirection,
    });
  }

  async deleteClip(clipId: string): Promise<void> {
    // 1. Get clip to get provider info
    const clip = await this.clipRepo.getById(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    // 2. Delete from provider
    try {
      await this.provider.deleteClip(clip.providerClipId);
    } catch (error) {
      // Log error but continue with DB deletion
      console.error(`Failed to delete clip from provider: ${error}`);
    }

    // 3. Delete from database
    await this.clipRepo.delete(clipId);
  }

  async trackClipView(clipId: string): Promise<void> {
    await this.clipRepo.incrementViewCount(clipId);
  }

  async trackClipShare(clipId: string): Promise<void> {
    await this.clipRepo.incrementShareCount(clipId);
  }

  async cleanupExpiredClips(): Promise<number> {
    // For now, just delete from DB
    // In production, you'd also delete from provider
    return this.clipRepo.deleteExpired();
  }

  // ========================================
  // Bookmark Operations
  // ========================================

  async createBookmark(input: CreateBookmarkInput): Promise<VideoBookmark> {
    return this.bookmarkRepo.create({
      gameId: input.gameId,
      directStreamId: input.directStreamId,
      viewerIdentityId: input.viewerIdentityId,
      timestampSeconds: input.timestampSeconds,
      label: input.label,
      notes: input.notes,
      isShared: input.isShared,
    });
  }

  async getBookmark(bookmarkId: string): Promise<VideoBookmark | null> {
    return this.bookmarkRepo.getById(bookmarkId);
  }

  async listBookmarks(options: ListBookmarksOptions): Promise<VideoBookmark[]> {
    const paginationOpts = { limit: options.limit, offset: options.offset };

    // Combined query: own bookmarks + shared bookmarks for a stream
    if (options.viewerId && options.directStreamId && options.includeShared) {
      return this.bookmarkRepo.listByStreamWithShared(
        options.directStreamId,
        options.viewerId,
        paginationOpts,
      );
    }

    if (options.viewerId) {
      return this.bookmarkRepo.listByViewer(options.viewerId, paginationOpts);
    }

    if (options.gameId) {
      return this.bookmarkRepo.listByGame(options.gameId, paginationOpts, options.publicOnly);
    }

    if (options.directStreamId) {
      return this.bookmarkRepo.listByStream(options.directStreamId, paginationOpts, options.publicOnly);
    }

    // Default: return only shared/public bookmarks
    return this.bookmarkRepo.listPublic(paginationOpts);
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    await this.bookmarkRepo.delete(bookmarkId);
  }

  async updateBookmark(
    bookmarkId: string,
    updates: { label?: string; notes?: string; isShared?: boolean }
  ): Promise<VideoBookmark> {
    return this.bookmarkRepo.update(bookmarkId, updates);
  }

  // ========================================
  // Recording Operations
  // ========================================

  async startRecording(
    streamKey: string,
    metadata?: Record<string, string>
  ): Promise<{ recordingId: string; status: string }> {
    const result = await this.provider.startRecording(streamKey, metadata || {});
    return {
      recordingId: result.id,
      status: 'recording',
    };
  }

  async stopRecording(recordingId: string): Promise<void> {
    await this.provider.stopRecording(recordingId);
  }

  async getRecordingStatus(recordingId: string): Promise<{
    status: string;
    durationSeconds: number;
    sizeBytes: number;
  }> {
    const status = await this.provider.getRecordingStatus(recordingId);
    return {
      status: status.isRecording ? 'recording' : 'completed',
      durationSeconds: status.durationSeconds,
      sizeBytes: status.sizeBytes ?? 0,
    };
  }
}

