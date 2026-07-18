/**
 * Event Repository (Prisma)
 *
 * Prisma-backed implementation for Event read/write operations.
 */

import type { PrismaClient, Event } from '@prisma/client';

import type { IEventReaderRepo, IEventWriterRepo } from '../IEventRepository';

export class EventRepository implements IEventReaderRepo, IEventWriterRepo {
  constructor(private prisma: PrismaClient) {}

  async getEventById(eventId: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id: eventId } });
  }

  async getEventByCanonicalPath(canonicalPath: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { canonicalPath } });
  }

  async getEventByChannelIdAndUrlKey(channelId: string, urlKey: string): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { channelId_urlKey: { channelId, urlKey } },
    });
  }

  async countEventsByChannelIdAndUrlKey(channelId: string, urlKey: string): Promise<number> {
    return this.prisma.event.count({
      where: { channelId, urlKey },
    });
  }

  async listEventsByChannel(channelId: string, options?: { state?: string; limit?: number; offset?: number }): Promise<Event[]> {
    const { state, limit = 50, offset = 0 } = options ?? {};
    return this.prisma.event.findMany({
      where: {
        channelId,
        ...(state ? { state } : {}),
      },
      orderBy: { startsAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async listEventsByOrganization(organizationId: string, options?: { state?: string; limit?: number; offset?: number }): Promise<Event[]> {
    const { state, limit = 50, offset = 0 } = options ?? {};
    return this.prisma.event.findMany({
      where: {
        organizationId,
        ...(state ? { state } : {}),
      },
      orderBy: { startsAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async listUpcomingEvents(channelId: string, startsAfter: Date): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: {
        channelId,
        startsAt: { gte: startsAfter },
        state: { in: ['scheduled', 'live'] },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createEvent(input: {
    organizationId: string;
    channelId: string;
    startsAt: Date;
    urlKey: string;
    canonicalPath: string;
    state?: string;
    streamType?: string | null;
    muxPlaybackId?: string | null;
    hlsManifestUrl?: string | null;
    externalEmbedUrl?: string | null;
    externalProvider?: string | null;
    accessMode?: string | null;
    priceCents?: number | null;
    currency?: string | null;
  }): Promise<Event> {
    return this.prisma.event.create({
      data: {
        ...input,
        state: input.state ?? 'scheduled',
      },
    });
  }

  async updateEvent(eventId: string, input: {
    startsAt?: Date;
    state?: string;
    streamType?: string | null;
    muxPlaybackId?: string | null;
    hlsManifestUrl?: string | null;
    externalEmbedUrl?: string | null;
    externalProvider?: string | null;
    accessMode?: string | null;
    priceCents?: number | null;
    currency?: string | null;
  }): Promise<Event> {
    return this.prisma.event.update({
      where: { id: eventId },
      data: input,
    });
  }

  async markEventLive(eventId: string, wentLiveAt: Date): Promise<Event> {
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        state: 'live',
        wentLiveAt,
      },
    });
  }

  async markEventEnded(eventId: string, endedAt: Date): Promise<Event> {
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        state: 'ended',
        endedAt,
      },
    });
  }

  async cancelEvent(eventId: string, cancelledAt: Date): Promise<Event> {
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        state: 'cancelled',
        cancelledAt,
      },
    });
  }
}

