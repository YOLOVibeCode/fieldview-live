/**
 * Watch Link Repository Interfaces (ISP)
 *
 * Prisma-backed access for org/team watch link state.
 */

import type { Organization, WatchChannel, WatchEventCode } from '@prisma/client';

export interface IWatchLinkReaderRepo {
  getOrganizationByShortName(shortName: string): Promise<Organization | null>;
  getChannelByOrgIdAndTeamSlug(orgId: string, teamSlug: string): Promise<WatchChannel | null>;
  getEventCodeByChannelIdAndCode(channelId: string, code: string): Promise<WatchEventCode | null>;
}

export interface IWatchLinkWriterRepo {
  createOrganization(input: { ownerAccountId: string; shortName: string; name: string }): Promise<Organization>;
  upsertChannel(input: {
    organizationId: string;
    teamSlug: string;
    displayName: string;
    requireEventCode: boolean;
    streamType: string;
    muxPlaybackId: string | null;
    hlsManifestUrl: string | null;
    externalEmbedUrl: string | null;
    externalProvider: string | null;
  }): Promise<WatchChannel>;
  updateChannelStream(input: {
    channelId: string;
    requireEventCode?: boolean;
    streamType: string;
    muxPlaybackId: string | null;
    hlsManifestUrl: string | null;
    externalEmbedUrl: string | null;
    externalProvider: string | null;
  }): Promise<WatchChannel>;
  createEventCode(input: { channelId: string; code: string }): Promise<WatchEventCode>;
  bindEventCodeToIp(input: { eventCodeId: string; boundIpHash: string; boundAt: Date }): Promise<void>;
}


