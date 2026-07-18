/**
 * Watch Link Repository (Prisma)
 *
 * Persists org/team watch link configuration and optional event codes.
 */

import type { PrismaClient } from '@prisma/client';

import type { IWatchLinkReaderRepo, IWatchLinkWriterRepo } from '../IWatchLinkRepository';

export class WatchLinkRepository implements IWatchLinkReaderRepo, IWatchLinkWriterRepo {
  constructor(private prisma: PrismaClient) {}

  async getOrganizationByShortName(shortName: string) {
    return this.prisma.organization.findUnique({ where: { shortName } });
  }

  async getOrganizationById(organizationId: string) {
    return this.prisma.organization.findUnique({ where: { id: organizationId } });
  }

  async getChannelByOrgIdAndTeamSlug(orgId: string, teamSlug: string) {
    return this.prisma.watchChannel.findUnique({
      where: { organizationId_teamSlug: { organizationId: orgId, teamSlug } },
    });
  }

  async getChannelById(channelId: string) {
    return this.prisma.watchChannel.findUnique({ where: { id: channelId } });
  }

  async getEventCodeByChannelIdAndCode(channelId: string, code: string) {
    return this.prisma.watchEventCode.findUnique({
      where: { channelId_code: { channelId, code } },
    });
  }

  async createOrganization(input: { ownerAccountId: string; shortName: string; name: string }) {
    return this.prisma.organization.create({ data: input });
  }

  async upsertChannel(input: {
    organizationId: string;
    teamSlug: string;
    displayName: string;
    requireEventCode: boolean;
    accessMode: string;
    priceCents: number | null;
    currency: string | null;
    streamType: string;
    muxPlaybackId: string | null;
    hlsManifestUrl: string | null;
    externalEmbedUrl: string | null;
    externalProvider: string | null;
  }) {
    const { organizationId, teamSlug, ...data } = input;
    return this.prisma.watchChannel.upsert({
      where: { organizationId_teamSlug: { organizationId, teamSlug } },
      create: { organizationId, teamSlug, ...data },
      update: { ...data },
    });
  }

  async updateChannelSettings(input: {
    channelId: string;
    displayName?: string;
    requireEventCode?: boolean;
    accessMode?: string;
    priceCents?: number | null;
    currency?: string | null;
  }) {
    const { channelId, ...data } = input;
    return this.prisma.watchChannel.update({
      where: { id: channelId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.requireEventCode !== undefined && { requireEventCode: data.requireEventCode }),
        ...(data.accessMode !== undefined && { accessMode: data.accessMode }),
        ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
        ...(data.currency !== undefined && { currency: data.currency }),
      },
    });
  }

  async updateChannelStream(input: {
    channelId: string;
    requireEventCode?: boolean;
    streamType: string;
    muxPlaybackId: string | null;
    hlsManifestUrl: string | null;
    externalEmbedUrl: string | null;
    externalProvider: string | null;
  }) {
    const { channelId, ...data } = input;
    return this.prisma.watchChannel.update({ where: { id: channelId }, data });
  }

  async createEventCode(input: { channelId: string; code: string }) {
    return this.prisma.watchEventCode.create({ data: input });
  }

  async bindEventCodeToIp(input: { eventCodeId: string; boundIpHash: string; boundAt: Date }) {
    await this.prisma.watchEventCode.update({
      where: { id: input.eventCodeId },
      data: { boundIpHash: input.boundIpHash, boundAt: input.boundAt },
    });
  }
}


