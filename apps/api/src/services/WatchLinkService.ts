/**
 * Watch Link Service
 *
 * Resolves stable watch links to the current stream source, with optional IP binding.
 */

import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { hashIp } from '../lib/ipHash';
import type { IEventReaderRepo } from '../repositories/IEventRepository';
import type { IWatchLinkReaderRepo, IWatchLinkWriterRepo } from '../repositories/IWatchLinkRepository';

import type {
  GetWatchLinkBootstrapInput,
  IWatchLinkReader,
  IWatchLinkWriter,
  WatchChannelRecord,
  WatchLinkBootstrap,
} from './IWatchLinkService';

export interface WatchLinkServiceOptions {
  ipHashSecret: string;
  enforceIpBindingWhenCodeProvided: boolean;
}

export class WatchLinkService {
  static fromRepos(
    readerRepo: IWatchLinkReaderRepo,
    writerRepo: IWatchLinkWriterRepo,
    eventReader: IEventReaderRepo,
    opts: WatchLinkServiceOptions
  ): WatchLinkService {
    const reader: IWatchLinkReader = {
      async getChannelByOrgAndSlug(orgShortName: string, teamSlug: string) {
        const org = await readerRepo.getOrganizationByShortName(orgShortName);
        if (!org) return null;
        const channel = await readerRepo.getChannelByOrgIdAndTeamSlug(org.id, teamSlug);
        if (!channel) return null;
        return {
          id: channel.id,
          orgShortName: org.shortName,
          teamSlug: channel.teamSlug,
          requireEventCode: channel.requireEventCode,
          accessMode: (channel.accessMode || 'public_free') as 'public_free' | 'pay_per_view',
          priceCents: channel.priceCents,
          currency: channel.currency || null,
          streamType: channel.streamType as WatchChannelRecord['streamType'],
          muxPlaybackId: channel.muxPlaybackId,
          hlsManifestUrl: channel.hlsManifestUrl,
          externalEmbedUrl: channel.externalEmbedUrl,
          externalProvider: channel.externalProvider as WatchChannelRecord['externalProvider'],
        };
      },
      async getEventCodeByChannelIdAndCode(channelId: string, code: string) {
        const event = await readerRepo.getEventCodeByChannelIdAndCode(channelId, code);
        if (!event) return null;
        return {
          id: event.id,
          code: event.code,
          status: event.status as 'active' | 'disabled',
          boundIpHash: event.boundIpHash,
          boundAt: event.boundAt,
        };
      },
    };

    const writer: IWatchLinkWriter = {
      async bindEventCodeToIp(eventCodeId: string, ipHash: string, boundAt: Date) {
        await writerRepo.bindEventCodeToIp({ eventCodeId, boundIpHash: ipHash, boundAt });
      },
    };

    return new WatchLinkService(reader, writer, eventReader, opts);
  }

  constructor(
    private reader: IWatchLinkReader,
    private writer: IWatchLinkWriter,
    private eventReader: IEventReaderRepo,
    private opts: WatchLinkServiceOptions
  ) {}

  async getPublicBootstrap(input: GetWatchLinkBootstrapInput): Promise<WatchLinkBootstrap> {
    const { orgShortName, teamSlug, eventCode, viewerIp } = input;

    const channel = await this.reader.getChannelByOrgAndSlug(orgShortName, teamSlug);
    if (!channel) {
      throw new NotFoundError('Watch link not found');
    }

    if (channel.requireEventCode && !eventCode) {
      throw new UnauthorizedError('Event code required');
    }

    if (eventCode && this.opts.enforceIpBindingWhenCodeProvided) {
      await this.enforceEventCodeIpBinding(channel, eventCode, viewerIp);
    }

    // Get current/upcoming event for this channel
    const now = new Date();
    const upcomingEvents = await this.eventReader.listUpcomingEvents(channel.id, now);
    const currentEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

    // Map Event to the expected shape for toBootstrap
    const eventForBootstrap = currentEvent ? {
      id: currentEvent.id,
      startsAt: currentEvent.startsAt,
      canonicalPath: currentEvent.canonicalPath,
    } : null;

    return this.toBootstrap(channel, eventForBootstrap);
  }

  private async enforceEventCodeIpBinding(
    channel: WatchChannelRecord,
    eventCode: string,
    viewerIp: string | null
  ): Promise<void> {
    if (!viewerIp) {
      throw new BadRequestError('Viewer IP unavailable');
    }

    const record = await this.reader.getEventCodeByChannelIdAndCode(channel.id, eventCode);
    if (!record || record.status !== 'active') {
      throw new UnauthorizedError('Invalid event code');
    }

    const ipHash = hashIp(viewerIp, this.opts.ipHashSecret);

    if (!record.boundIpHash) {
      await this.writer.bindEventCodeToIp(record.id, ipHash, new Date());
      return;
    }

    if (record.boundIpHash !== ipHash) {
      throw new ForbiddenError('This event code is already in use from another network');
    }
  }

  private toBootstrap(channel: WatchChannelRecord, event: { id: string; startsAt: Date; canonicalPath: string; [key: string]: any } | null): WatchLinkBootstrap {
    const base = {
      channelId: channel.id,
      orgShortName: channel.orgShortName,
      teamSlug: channel.teamSlug,
      accessMode: channel.accessMode,
      priceCents: channel.priceCents,
      currency: channel.currency || null,
      eventId: event?.id || null,
      eventStartsAt: event?.startsAt.toISOString() || null,
      eventTitle: event ? `${channel.orgShortName} ${channel.teamSlug}` : null,
    };

    if (channel.streamType === 'mux_playback') {
      if (!channel.muxPlaybackId) throw new BadRequestError('Missing playback ID');
      return {
        ...base,
        playerType: 'hls' as const,
        streamUrl: `https://stream.mux.com/${channel.muxPlaybackId}.m3u8`,
      };
    }

    if (channel.streamType === 'byo_hls') {
      if (!channel.hlsManifestUrl) throw new BadRequestError('Missing HLS manifest URL');
      return {
        ...base,
        playerType: 'hls' as const,
        streamUrl: channel.hlsManifestUrl,
      };
    }

    if (channel.streamType === 'external_embed') {
      if (!channel.externalEmbedUrl) throw new BadRequestError('Missing embed URL');
      return {
        ...base,
        playerType: 'embed' as const,
        streamUrl: channel.externalEmbedUrl,
      };
    }

    throw new BadRequestError('Unsupported stream type');
  }
}


