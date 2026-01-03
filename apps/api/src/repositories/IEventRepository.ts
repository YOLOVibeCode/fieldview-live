/**
 * Event Repository Interfaces (ISP)
 *
 * Segregated read/write interfaces for Event management.
 */

import type { Event } from '@prisma/client';

export interface EventRecord {
  id: string;
  organizationId: string;
  channelId: string;
  startsAt: Date;
  urlKey: string;
  canonicalPath: string;
  state: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamType: string | null;
  muxPlaybackId: string | null;
  hlsManifestUrl: string | null;
  externalEmbedUrl: string | null;
  externalProvider: string | null;
  accessMode: string | null;
  priceCents: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  wentLiveAt: Date | null;
  endedAt: Date | null;
}

export interface IEventReaderRepo {
  getEventById(eventId: string): Promise<Event | null>;
  getEventByCanonicalPath(canonicalPath: string): Promise<Event | null>;
  getEventByChannelIdAndUrlKey(channelId: string, urlKey: string): Promise<Event | null>;
  countEventsByChannelIdAndUrlKey(channelId: string, urlKey: string): Promise<number>;
  listEventsByChannel(channelId: string, options?: { state?: string; limit?: number; offset?: number }): Promise<Event[]>;
  listEventsByOrganization(organizationId: string, options?: { state?: string; limit?: number; offset?: number }): Promise<Event[]>;
  listUpcomingEvents(channelId: string, startsAfter: Date): Promise<Event[]>;
}

export interface IEventWriterRepo {
  createEvent(input: {
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
  }): Promise<Event>;
  updateEvent(eventId: string, input: {
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
  }): Promise<Event>;
  markEventLive(eventId: string, wentLiveAt: Date): Promise<Event>;
  markEventEnded(eventId: string, endedAt: Date): Promise<Event>;
  cancelEvent(eventId: string, cancelledAt: Date): Promise<Event>;
}

