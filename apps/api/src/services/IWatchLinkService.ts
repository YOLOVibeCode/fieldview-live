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
  streamUrl: string;
  playerType: 'hls' | 'embed';
  orgShortName: string;
  teamSlug: string;
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


