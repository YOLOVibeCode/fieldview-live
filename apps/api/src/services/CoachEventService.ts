/**
 * Coach Event Service
 *
 * Manages events for coaches/team managers with authorization checks.
 */

import type { IEventWriterRepo } from '../repositories/IEventRepository';
import type { IWatchLinkReaderRepo } from '../repositories/IWatchLinkRepository';

import type { IAuthorizationService } from './IAuthorizationService';
import type { IEventKeyGenerator } from './IEventKeyGenerator';
import type { ILinkTemplateRenderer } from './ILinkTemplateRenderer';
import type { CreateEventInput, UpdateEventInput, EventRecord, ICoachEventService } from './ICoachEventService';

export class CoachEventService implements ICoachEventService {
  constructor(
    private authorizationService: IAuthorizationService,
    private eventKeyGenerator: IEventKeyGenerator,
    private linkTemplateRenderer: ILinkTemplateRenderer,
    private eventWriter: IEventWriterRepo,
    private watchLinkReader: IWatchLinkReaderRepo
  ) {}

  async createEvent(ownerUserId: string, input: CreateEventInput): Promise<EventRecord> {
    // Check authorization
    await this.authorizationService.assertCanManageOrganization(ownerUserId, input.organizationId);

    // Get channel and organization to inherit defaults
    const channel = await this.watchLinkReader.getChannelById(input.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    const organization = await this.watchLinkReader.getOrganizationById(input.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Generate URL key if not provided
    let urlKey = input.urlKey;
    if (!urlKey) {
      const baseKey = this.eventKeyGenerator.generateUrlKey(input.startsAt);
      urlKey = await this.eventKeyGenerator.ensureUniqueKey(input.channelId, baseKey);
    } else {
      urlKey = await this.eventKeyGenerator.ensureUniqueKey(input.channelId, urlKey);
    }

    // Generate canonical path if not provided (using preset_c as default)
    let canonicalPath = input.canonicalPath;
    if (!canonicalPath) {
      canonicalPath = this.linkTemplateRenderer.renderPreset({
        presetId: 'preset_c',
        orgShortName: organization.shortName,
        teamSlug: channel.teamSlug,
        urlKey,
      });
    }

    // Inherit defaults from channel if not provided
    const streamType = input.streamType ?? (channel.streamType as 'mux_playback' | 'byo_hls' | 'external_embed' | null);
    const muxPlaybackId = input.muxPlaybackId ?? channel.muxPlaybackId;
    const hlsManifestUrl = input.hlsManifestUrl ?? channel.hlsManifestUrl;
    const externalEmbedUrl = input.externalEmbedUrl ?? channel.externalEmbedUrl;
    const externalProvider = input.externalProvider ?? (channel.externalProvider as 'youtube' | 'twitch' | 'vimeo' | 'other' | null);
    const accessMode = input.accessMode ?? (channel.accessMode as 'public_free' | 'pay_per_view' | null);
    const priceCents = input.priceCents ?? channel.priceCents;
    const currency = input.currency ?? channel.currency ?? 'USD';

    const event = await this.eventWriter.createEvent({
      organizationId: input.organizationId,
      channelId: input.channelId,
      startsAt: input.startsAt,
      urlKey,
      canonicalPath,
      streamType,
      muxPlaybackId,
      hlsManifestUrl,
      externalEmbedUrl,
      externalProvider,
      accessMode,
      priceCents,
      currency,
    });

    return this.mapEventToRecord(event);
  }

  async updateEvent(ownerUserId: string, eventId: string, input: UpdateEventInput): Promise<EventRecord> {
    await this.authorizationService.assertCanManageEvent(ownerUserId, eventId);

    const event = await this.eventWriter.updateEvent(eventId, input);
    return this.mapEventToRecord(event);
  }

  async setEventLive(ownerUserId: string, eventId: string): Promise<EventRecord> {
    await this.authorizationService.assertCanManageEvent(ownerUserId, eventId);

    const event = await this.eventWriter.markEventLive(eventId, new Date());
    return this.mapEventToRecord(event);
  }

  async updateEventStreamSource(ownerUserId: string, eventId: string, streamSource: {
    streamType: 'mux_playback' | 'byo_hls' | 'external_embed';
    muxPlaybackId?: string | null;
    hlsManifestUrl?: string | null;
    externalEmbedUrl?: string | null;
    externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other' | null;
  }): Promise<EventRecord> {
    await this.authorizationService.assertCanManageEvent(ownerUserId, eventId);

    const event = await this.eventWriter.updateEvent(eventId, streamSource);
    return this.mapEventToRecord(event);
  }

  private mapEventToRecord(event: { id: string; organizationId: string; channelId: string; startsAt: Date; urlKey: string; canonicalPath: string; state: string; streamType: string | null; muxPlaybackId: string | null; hlsManifestUrl: string | null; externalEmbedUrl: string | null; externalProvider: string | null; accessMode: string | null; priceCents: number | null; currency: string | null; createdAt: Date; updatedAt: Date }): EventRecord {
    return {
      id: event.id,
      organizationId: event.organizationId,
      channelId: event.channelId,
      startsAt: event.startsAt,
      urlKey: event.urlKey,
      canonicalPath: event.canonicalPath,
      state: event.state as 'scheduled' | 'live' | 'ended' | 'cancelled',
      streamType: event.streamType,
      muxPlaybackId: event.muxPlaybackId,
      hlsManifestUrl: event.hlsManifestUrl,
      externalEmbedUrl: event.externalEmbedUrl,
      externalProvider: event.externalProvider,
      accessMode: event.accessMode,
      priceCents: event.priceCents,
      currency: event.currency,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}

