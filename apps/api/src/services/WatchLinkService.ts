/**
 * Watch Link Service
 *
 * Resolves stable watch links to the current stream source, with optional IP binding.
 */

import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { hashIp } from '../lib/ipHash';
import type { IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';
import type {
  GetWatchLinkBootstrapInput,
  IWatchLinkCheckoutWriter,
  IWatchLinkReader,
  IWatchLinkWriter,
  WatchChannelRecord,
  WatchLinkBootstrap,
  WatchLinkCheckoutResponse,
} from './IWatchLinkService';
import type { IWatchLinkReaderRepo, IWatchLinkWriterRepo } from '../repositories/IWatchLinkRepository';

export interface WatchLinkServiceOptions {
  ipHashSecret: string;
  enforceIpBindingWhenCodeProvided: boolean;
}

export class WatchLinkService implements IWatchLinkCheckoutWriter {
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
          accessMode: (channel.accessMode || 'public_free') as 'public_free' | 'pay_per_view',
          priceCents: channel.priceCents,
          currency: channel.currency,
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

    return new WatchLinkService(reader, writer, opts, null, null, null, null);
  }

  static withCheckout(
    readerRepo: IWatchLinkReaderRepo,
    writerRepo: IWatchLinkWriterRepo,
    viewerIdentityReader: IViewerIdentityReader,
    viewerIdentityWriter: IViewerIdentityWriter,
    purchaseWriter: IPurchaseWriter,
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
          accessMode: (channel.accessMode || 'public_free') as 'public_free' | 'pay_per_view',
          priceCents: channel.priceCents,
          currency: channel.currency,
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

    return new WatchLinkService(reader, writer, opts, viewerIdentityReader, viewerIdentityWriter, purchaseWriter, readerRepo);
  }

  constructor(
    private reader: IWatchLinkReader,
    private writer: IWatchLinkWriter,
    private opts: WatchLinkServiceOptions,
    private viewerIdentityReader: IViewerIdentityReader | null = null,
    private viewerIdentityWriter: IViewerIdentityWriter | null = null,
    private purchaseWriter: IPurchaseWriter | null = null,
    private readerRepo: IWatchLinkReaderRepo | null = null
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
    const base = {
      accessMode: channel.accessMode,
      orgShortName: channel.orgShortName,
      teamSlug: channel.teamSlug,
    };

    // If pay_per_view, return pricing info (no stream URL yet)
    if (channel.accessMode === 'pay_per_view') {
      if (!channel.priceCents || channel.priceCents <= 0) {
        throw new BadRequestError('Invalid pricing for pay_per_view channel');
      }
      return {
        ...base,
        priceCents: channel.priceCents,
        currency: channel.currency || 'USD',
        checkoutRequired: true,
      };
    }

    // If public_free, return stream URL
    if (channel.streamType === 'mux_playback') {
      if (!channel.muxPlaybackId) throw new BadRequestError('Missing playback ID');
      return {
        ...base,
        playerType: 'hls',
        streamUrl: `https://stream.mux.com/${channel.muxPlaybackId}.m3u8`,
      };
    }

    if (channel.streamType === 'byo_hls') {
      if (!channel.hlsManifestUrl) throw new BadRequestError('Missing HLS manifest URL');
      return {
        ...base,
        playerType: 'hls',
        streamUrl: channel.hlsManifestUrl,
      };
    }

    if (channel.streamType === 'external_embed') {
      if (!channel.externalEmbedUrl) throw new BadRequestError('Missing embed URL');
      return {
        ...base,
        playerType: 'embed',
        streamUrl: channel.externalEmbedUrl,
      };
    }

    throw new BadRequestError('Unsupported stream type');
  }

  async createCheckout(
    orgShortName: string,
    teamSlug: string,
    viewerEmail: string,
    viewerPhone?: string,
    eventCode?: string,
    returnUrl?: string
  ): Promise<WatchLinkCheckoutResponse> {
    if (!this.viewerIdentityReader || !this.viewerIdentityWriter || !this.purchaseWriter || !this.readerRepo) {
      throw new Error('Checkout dependencies not available');
    }

    const APP_URL = process.env.APP_URL || 'https://fieldview.live';
    const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');

    // Get channel
    const channel = await this.reader.getChannelByOrgAndSlug(orgShortName, teamSlug);
    if (!channel) {
      throw new NotFoundError('Watch link not found');
    }

    // Validate accessMode
    if (channel.accessMode !== 'pay_per_view') {
      throw new BadRequestError('Channel is not configured for pay-per-view');
    }

    if (!channel.priceCents || channel.priceCents <= 0) {
      throw new BadRequestError('Invalid pricing for pay_per_view channel');
    }

    // Validate event code if required
    if (channel.requireEventCode && !eventCode) {
      throw new UnauthorizedError('Event code required');
    }

    if (eventCode) {
      const eventRecord = await this.reader.getEventCodeByChannelIdAndCode(channel.id, eventCode);
      if (!eventRecord || eventRecord.status !== 'active') {
        throw new UnauthorizedError('Invalid event code');
      }
    }

    // Find or create viewer identity
    let viewer = await this.viewerIdentityReader.getByEmail(viewerEmail);
    if (!viewer) {
      viewer = await this.viewerIdentityWriter.create({
        email: viewerEmail,
        phoneE164: viewerPhone,
      });
    } else if (viewerPhone && !viewer.phoneE164) {
      viewer = await this.viewerIdentityWriter.update(viewer.id, {
        phoneE164: viewerPhone,
      });
    }

    // Calculate marketplace split
    const split = calculateMarketplaceSplit(channel.priceCents, PLATFORM_FEE_PERCENT);

    // Create purchase record with channelId (not gameId)
    const purchase = await this.purchaseWriter.create({
      gameId: null,
      channelId: channel.id,
      viewerId: viewer.id,
      amountCents: channel.priceCents,
      currency: channel.currency || 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
    });

    // Return checkout URL
    const finalReturnUrl = returnUrl || `${APP_URL}/checkout/${purchase.id}/success`;
    const checkoutUrl = `${APP_URL}/checkout/${purchase.id}?square_checkout=true&email=${encodeURIComponent(viewerEmail)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;

    return {
      purchaseId: purchase.id,
      checkoutUrl,
    };
  }
}


