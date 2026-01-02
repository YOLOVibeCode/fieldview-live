/**
 * Watch Link Service Interfaces (ISP)
 *
 * Supports stable org/team watch links with optional event-code gating.
 */

export type WatchChannelStreamType = 'mux_playback' | 'byo_hls' | 'external_embed';

export interface WatchChannelRecord {
  id: string;
  orgShortName: string;
  teamSlug: string;
  accessMode: 'public_free' | 'pay_per_view';
  priceCents: number | null;
  currency: string | null;
  requireEventCode: boolean;
  streamType: WatchChannelStreamType;
  muxPlaybackId: string | null;
  hlsManifestUrl: string | null;
  externalEmbedUrl: string | null;
  externalProvider: 'youtube' | 'twitch' | 'vimeo' | 'other' | null;
}

export interface WatchEventCodeRecord {
  id: string;
  code: string;
  status: 'active' | 'disabled';
  boundIpHash: string | null;
  boundAt: Date | null;
}

export interface WatchLinkBootstrap {
  accessMode: 'public_free' | 'pay_per_view';
  orgShortName: string;
  teamSlug: string;
  // Present when accessMode is public_free
  playerType?: 'hls' | 'embed';
  streamUrl?: string;
  // Present when accessMode is pay_per_view
  priceCents?: number;
  currency?: string;
  checkoutRequired?: boolean;
}

export interface GetWatchLinkBootstrapInput {
  orgShortName: string;
  teamSlug: string;
  eventCode?: string;
  viewerIp: string | null;
}

export interface IWatchLinkReader {
  getChannelByOrgAndSlug(orgShortName: string, teamSlug: string): Promise<WatchChannelRecord | null>;
  getEventCodeByChannelIdAndCode(channelId: string, code: string): Promise<WatchEventCodeRecord | null>;
}

export interface IWatchLinkWriter {
  bindEventCodeToIp(eventCodeId: string, ipHash: string, boundAt: Date): Promise<void>;
}

export interface WatchLinkCheckoutResponse {
  purchaseId: string;
  checkoutUrl: string;
}

export interface IWatchLinkCheckoutWriter {
  createCheckout(
    orgShortName: string,
    teamSlug: string,
    viewerEmail: string,
    viewerPhone?: string,
    eventCode?: string,
    returnUrl?: string
  ): Promise<WatchLinkCheckoutResponse>;
}


