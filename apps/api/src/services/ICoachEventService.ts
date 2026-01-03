/**
 * Coach Event Service Interface (ISP)
 *
 * Single responsibility: manage events for coaches/team managers.
 */

export interface CreateEventInput {
  organizationId: string;
  channelId: string;
  startsAt: Date;
  urlKey?: string; // Auto-generated if not provided
  canonicalPath?: string; // Auto-generated if not provided
  streamType?: 'mux_playback' | 'byo_hls' | 'external_embed' | null;
  muxPlaybackId?: string | null;
  hlsManifestUrl?: string | null;
  externalEmbedUrl?: string | null;
  externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other' | null;
  accessMode?: 'public_free' | 'pay_per_view' | null;
  priceCents?: number | null;
  currency?: string | null;
}

export interface UpdateEventInput {
  startsAt?: Date;
  streamType?: 'mux_playback' | 'byo_hls' | 'external_embed' | null;
  muxPlaybackId?: string | null;
  hlsManifestUrl?: string | null;
  externalEmbedUrl?: string | null;
  externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other' | null;
  accessMode?: 'public_free' | 'pay_per_view' | null;
  priceCents?: number | null;
  currency?: string | null;
}

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
}

export interface ICoachEventService {
  createEvent(ownerUserId: string, input: CreateEventInput): Promise<EventRecord>;
  updateEvent(ownerUserId: string, eventId: string, input: UpdateEventInput): Promise<EventRecord>;
  setEventLive(ownerUserId: string, eventId: string): Promise<EventRecord>;
  updateEventStreamSource(ownerUserId: string, eventId: string, streamSource: {
    streamType: 'mux_playback' | 'byo_hls' | 'external_embed';
    muxPlaybackId?: string | null;
    hlsManifestUrl?: string | null;
    externalEmbedUrl?: string | null;
    externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other' | null;
  }): Promise<EventRecord>;
}

