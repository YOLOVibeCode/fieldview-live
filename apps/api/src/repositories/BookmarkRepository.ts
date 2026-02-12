/**
 * BookmarkRepository
 * 
 * Implements IBookmarkReader + IBookmarkWriter interfaces
 * Follows ISP: Clients can depend on only what they need
 */

import { PrismaClient, VideoBookmark } from '@prisma/client';
import {
  IBookmarkReader,
  IBookmarkWriter,
  CreateBookmarkInput,
  UpdateBookmarkInput,
  BookmarkListOptions,
} from './interfaces/IBookmarkRepository';

export class BookmarkRepository implements IBookmarkReader, IBookmarkWriter {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // IBookmarkWriter Implementation
  // ========================================

  async create(data: CreateBookmarkInput): Promise<VideoBookmark> {
    return this.prisma.videoBookmark.create({
      data: {
        gameId: data.gameId,
        directStreamId: data.directStreamId,
        clipId: data.clipId,
        viewerIdentityId: data.viewerIdentityId,
        timestampSeconds: data.timestampSeconds,
        label: data.label,
        notes: data.notes,
        isShared: data.isShared ?? true,
        bufferSeconds: data.bufferSeconds ?? 5,
      },
    });
  }

  async update(id: string, data: UpdateBookmarkInput): Promise<VideoBookmark> {
    return this.prisma.videoBookmark.update({
      where: { id },
      data: {
        label: data.label,
        notes: data.notes,
        isShared: data.isShared,
        clipId: data.clipId,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.videoBookmark.delete({
      where: { id },
    });
  }

  async deleteByViewer(viewerId: string): Promise<number> {
    const result = await this.prisma.videoBookmark.deleteMany({
      where: {
        viewerIdentityId: viewerId,
      },
    });
    return result.count;
  }

  async linkToClip(bookmarkId: string, clipId: string): Promise<VideoBookmark> {
    return this.prisma.videoBookmark.update({
      where: { id: bookmarkId },
      data: {
        clipId,
        updatedAt: new Date(),
      },
    });
  }

  // ========================================
  // IBookmarkReader Implementation
  // ========================================

  async getById(id: string): Promise<VideoBookmark | null> {
    return this.prisma.videoBookmark.findUnique({
      where: { id },
    });
  }

  async listByViewer(viewerId: string, options?: BookmarkListOptions): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: { viewerIdentityId: viewerId },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByGame(gameId: string, options?: BookmarkListOptions, publicOnly?: boolean): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: { gameId, ...(publicOnly && { isShared: true }) },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByStream(streamId: string, options?: BookmarkListOptions, publicOnly?: boolean): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: { directStreamId: streamId, ...(publicOnly && { isShared: true }) },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByClip(clipId: string, options?: BookmarkListOptions): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: { clipId },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByStreamWithShared(
    streamId: string,
    viewerId: string,
    options?: BookmarkListOptions,
  ): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: {
        directStreamId: streamId,
        OR: [
          { viewerIdentityId: viewerId },
          { isShared: true },
        ],
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { timestampSeconds: 'asc' },
    });
  }

  async listPublic(options?: BookmarkListOptions): Promise<VideoBookmark[]> {
    return this.prisma.videoBookmark.findMany({
      where: { isShared: true },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async countByViewer(viewerId: string): Promise<number> {
    return this.prisma.videoBookmark.count({
      where: { viewerIdentityId: viewerId },
    });
  }

  async existsForTimestamp(
    viewerId: string,
    gameOrStreamId: string,
    timestampSeconds: number
  ): Promise<boolean> {
    const bookmark = await this.prisma.videoBookmark.findFirst({
      where: {
        viewerIdentityId: viewerId,
        timestampSeconds,
        OR: [{ gameId: gameOrStreamId }, { directStreamId: gameOrStreamId }],
      },
    });
    return bookmark !== null;
  }
}

