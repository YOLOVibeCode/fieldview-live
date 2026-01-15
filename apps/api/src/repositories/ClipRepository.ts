/**
 * ClipRepository
 * 
 * Implements IClipReader + IClipWriter interfaces
 * Follows ISP: Clients can depend on only what they need
 */

import { PrismaClient, VideoClip } from '@prisma/client';
import {
  IClipReader,
  IClipWriter,
  CreateClipInput,
  UpdateClipInput,
  ClipListOptions,
} from './interfaces/IClipRepository';

export class ClipRepository implements IClipReader, IClipWriter {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // IClipWriter Implementation
  // ========================================

  async create(data: CreateClipInput): Promise<VideoClip> {
    return this.prisma.videoClip.create({
      data: {
        gameId: data.gameId,
        directStreamId: data.directStreamId,
        directStreamSlug: data.directStreamSlug,
        providerName: data.providerName,
        providerClipId: data.providerClipId,
        providerRecordingId: data.providerRecordingId,
        title: data.title,
        description: data.description,
        startTimeSeconds: data.startTimeSeconds,
        endTimeSeconds: data.endTimeSeconds,
        durationSeconds: data.durationSeconds,
        playbackUrl: data.playbackUrl,
        thumbnailUrl: data.thumbnailUrl,
        status: data.status,
        isPublic: data.isPublic ?? false,
        createdById: data.createdById,
        createdByType: data.createdByType,
        expiresAt: data.expiresAt,
      },
    });
  }

  async update(id: string, data: UpdateClipInput): Promise<VideoClip> {
    return this.prisma.videoClip.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        playbackUrl: data.playbackUrl,
        thumbnailUrl: data.thumbnailUrl,
        status: data.status,
        isPublic: data.isPublic,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.videoClip.delete({
      where: { id },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.videoClip.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  async incrementShareCount(id: string): Promise<void> {
    await this.prisma.videoClip.update({
      where: { id },
      data: {
        shareCount: {
          increment: 1,
        },
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.videoClip.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
    return result.count;
  }

  // ========================================
  // IClipReader Implementation
  // ========================================

  async getById(id: string): Promise<VideoClip | null> {
    return this.prisma.videoClip.findUnique({
      where: { id },
    });
  }

  async listByGame(gameId: string, options?: ClipListOptions): Promise<VideoClip[]> {
    return this.prisma.videoClip.findMany({
      where: { gameId },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByStream(streamId: string, options?: ClipListOptions): Promise<VideoClip[]> {
    return this.prisma.videoClip.findMany({
      where: { directStreamId: streamId },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listByStreamSlug(slug: string, options?: ClipListOptions): Promise<VideoClip[]> {
    return this.prisma.videoClip.findMany({
      where: { directStreamSlug: slug },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async listPublic(options?: ClipListOptions): Promise<VideoClip[]> {
    return this.prisma.videoClip.findMany({
      where: { isPublic: true },
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy
        ? { [options.orderBy]: options.orderDirection ?? 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async countByGame(gameId: string): Promise<number> {
    return this.prisma.videoClip.count({
      where: { gameId },
    });
  }

  async countByStream(streamId: string): Promise<number> {
    return this.prisma.videoClip.count({
      where: { directStreamId: streamId },
    });
  }

  async getByProvider(providerName: string, providerClipId: string): Promise<VideoClip | null> {
    return this.prisma.videoClip.findUnique({
      where: {
        providerName_providerClipId: {
          providerName,
          providerClipId,
        },
      },
    });
  }
}

