/**
 * Watch Link Service
 *
 * Resolves stable watch links to the current stream source, with optional IP binding.
 */

import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { hashIp } from '../lib/ipHash';
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

    return new WatchLinkService(reader, writer, opts);
  }

  constructor(
    private reader: IWatchLinkReader,
    private writer: IWatchLinkWriter,
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

    return this.toBootstrap(channel);
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

  private toBootstrap(channel: WatchChannelRecord): WatchLinkBootstrap {
    if (channel.streamType === 'mux_playback') {
      if (!channel.muxPlaybackId) throw new BadRequestError('Missing playback ID');
      return {
        playerType: 'hls',
        streamUrl: `https://stream.mux.com/${channel.muxPlaybackId}.m3u8`,
        orgShortName: channel.orgShortName,
        teamSlug: channel.teamSlug,
      };
    }

    if (channel.streamType === 'byo_hls') {
      if (!channel.hlsManifestUrl) throw new BadRequestError('Missing HLS manifest URL');
      return {
        playerType: 'hls',
        streamUrl: channel.hlsManifestUrl,
        orgShortName: channel.orgShortName,
        teamSlug: channel.teamSlug,
      };
    }

    if (channel.streamType === 'external_embed') {
      if (!channel.externalEmbedUrl) throw new BadRequestError('Missing embed URL');
      return {
        playerType: 'embed',
        streamUrl: channel.externalEmbedUrl,
        orgShortName: channel.orgShortName,
        teamSlug: channel.teamSlug,
      };
    }

    throw new BadRequestError('Unsupported stream type');
  }
}


