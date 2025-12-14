/**
 * Playback Session Repository Implementation
 * 
 * Prisma-based implementation of IPlaybackSessionReader and IPlaybackSessionWriter.
 */

import type { PrismaClient, PlaybackSession } from '@prisma/client';

import type {
  IPlaybackSessionReader,
  IPlaybackSessionWriter,
  CreatePlaybackSessionData,
  UpdatePlaybackSessionData,
} from '../IPlaybackSessionRepository';

export class PlaybackSessionRepository implements IPlaybackSessionReader, IPlaybackSessionWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<PlaybackSession | null> {
    return this.prisma.playbackSession.findUnique({
      where: { id },
      include: {
        entitlement: {
          include: {
            purchase: {
              include: {
                viewer: true,
                game: true,
              },
            },
          },
        },
      },
    });
  }

  async listByEntitlementId(entitlementId: string): Promise<PlaybackSession[]> {
    return this.prisma.playbackSession.findMany({
      where: { entitlementId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(data: CreatePlaybackSessionData): Promise<PlaybackSession> {
    return this.prisma.playbackSession.create({
      data: {
        entitlementId: data.entitlementId,
        startedAt: data.startedAt || new Date(),
      },
    });
  }

  async update(id: string, data: UpdatePlaybackSessionData): Promise<PlaybackSession> {
    return this.prisma.playbackSession.update({
      where: { id },
      data: {
        ...data,
        endedAt: data.endedAt === null ? null : data.endedAt,
      },
    });
  }
}
