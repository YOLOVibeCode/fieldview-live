/**
 * Owner Watch Link Routes
 *
 * Owner-managed org/team channels that back stable watch links.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { CreateWatchChannelSchema, CreateWatchEventCodeSchema, CreateWatchOrgSchema, UpdateWatchChannelStreamSchema } from '@fieldview/data-model';

import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';

const router = express.Router();

function requireOwnerId(req: AuthRequest): string {
  if (!req.ownerAccountId) throw new Error('Owner account ID not found');
  return req.ownerAccountId;
}

function normalizeStreamUpdate(input: z.infer<typeof UpdateWatchChannelStreamSchema> | z.infer<typeof CreateWatchChannelSchema>) {
  if (input.streamType === 'mux_playback') {
    if (!('muxPlaybackId' in input) || !input.muxPlaybackId) throw new BadRequestError('muxPlaybackId is required');
    return {
      streamType: input.streamType,
      muxPlaybackId: input.muxPlaybackId,
      hlsManifestUrl: null,
      externalEmbedUrl: null,
      externalProvider: null,
    };
  }
  if (input.streamType === 'byo_hls') {
    if (!('hlsManifestUrl' in input) || !input.hlsManifestUrl) throw new BadRequestError('hlsManifestUrl is required');
    return {
      streamType: input.streamType,
      muxPlaybackId: null,
      hlsManifestUrl: input.hlsManifestUrl,
      externalEmbedUrl: null,
      externalProvider: null,
    };
  }
  if (input.streamType === 'external_embed') {
    if (!('externalEmbedUrl' in input) || !input.externalEmbedUrl) throw new BadRequestError('externalEmbedUrl is required');
    if (!('externalProvider' in input) || !input.externalProvider) throw new BadRequestError('externalProvider is required');
    return {
      streamType: input.streamType,
      muxPlaybackId: null,
      hlsManifestUrl: null,
      externalEmbedUrl: input.externalEmbedUrl,
      externalProvider: input.externalProvider,
    };
  }
  throw new BadRequestError('Unsupported streamType');
}

/**
 * POST /api/owners/me/watch-links/orgs
 */
router.post(
  '/me/watch-links/orgs',
  requireOwnerAuth,
  validateRequest({ body: CreateWatchOrgSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const ownerAccountId = requireOwnerId(req);
        const body = req.body as z.infer<typeof CreateWatchOrgSchema>;

        const repo = new WatchLinkRepository(prisma);
        const org = await repo.createOrganization({
          ownerAccountId,
          shortName: body.shortName,
          name: body.name,
        });

        res.status(201).json({ id: org.id, shortName: org.shortName, name: org.name });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/watch-links/orgs/:orgShortName/channels
 */
router.post(
  '/me/watch-links/orgs/:orgShortName/channels',
  requireOwnerAuth,
  validateRequest({ body: CreateWatchChannelSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const ownerAccountId = requireOwnerId(req);
        const orgShortName = req.params.orgShortName;
        if (!orgShortName) throw new BadRequestError('Missing org short name');
        const body = req.body as z.infer<typeof CreateWatchChannelSchema>;

        const repo = new WatchLinkRepository(prisma);
        const org = await repo.getOrganizationByShortName(orgShortName);
        if (!org) throw new NotFoundError('Organization not found');
        if (org.ownerAccountId !== ownerAccountId) throw new ForbiddenError('Not allowed');

        const normalized = normalizeStreamUpdate(body);
        const channel = await repo.upsertChannel({
          organizationId: org.id,
          teamSlug: body.teamSlug,
          displayName: body.displayName,
          requireEventCode: body.requireEventCode ?? false,
          ...normalized,
        });

        res.status(201).json({
          id: channel.id,
          orgShortName: org.shortName,
          teamSlug: channel.teamSlug,
          displayName: channel.displayName,
          requireEventCode: channel.requireEventCode,
          streamType: channel.streamType,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/owners/me/watch-links/orgs/:orgShortName/channels/:teamSlug
 *
 * Updates the "current stream" behind the stable watch link.
 */
router.patch(
  '/me/watch-links/orgs/:orgShortName/channels/:teamSlug',
  requireOwnerAuth,
  validateRequest({ body: UpdateWatchChannelStreamSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const ownerAccountId = requireOwnerId(req);
        const orgShortName = req.params.orgShortName;
        const teamSlug = req.params.teamSlug;
        if (!orgShortName || !teamSlug) throw new BadRequestError('Missing org/team');

        const body = req.body as z.infer<typeof UpdateWatchChannelStreamSchema>;
        const repo = new WatchLinkRepository(prisma);
        const org = await repo.getOrganizationByShortName(orgShortName);
        if (!org) throw new NotFoundError('Organization not found');
        if (org.ownerAccountId !== ownerAccountId) throw new ForbiddenError('Not allowed');

        const channel = await repo.getChannelByOrgIdAndTeamSlug(org.id, teamSlug);
        if (!channel) throw new NotFoundError('Channel not found');

        const normalized = normalizeStreamUpdate(body);
        const updated = await repo.updateChannelStream({
          channelId: channel.id,
          requireEventCode: body.requireEventCode,
          ...normalized,
        });

        res.json({
          id: updated.id,
          orgShortName: org.shortName,
          teamSlug: updated.teamSlug,
          displayName: updated.displayName,
          requireEventCode: updated.requireEventCode,
          streamType: updated.streamType,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/watch-links/orgs/:orgShortName/channels/:teamSlug/event-codes
 */
router.post(
  '/me/watch-links/orgs/:orgShortName/channels/:teamSlug/event-codes',
  requireOwnerAuth,
  validateRequest({ body: CreateWatchEventCodeSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const ownerAccountId = requireOwnerId(req);
        const orgShortName = req.params.orgShortName;
        const teamSlug = req.params.teamSlug;
        if (!orgShortName || !teamSlug) throw new BadRequestError('Missing org/team');

        const body = req.body as z.infer<typeof CreateWatchEventCodeSchema>;
        const repo = new WatchLinkRepository(prisma);
        const org = await repo.getOrganizationByShortName(orgShortName);
        if (!org) throw new NotFoundError('Organization not found');
        if (org.ownerAccountId !== ownerAccountId) throw new ForbiddenError('Not allowed');

        const channel = await repo.getChannelByOrgIdAndTeamSlug(org.id, teamSlug);
        if (!channel) throw new NotFoundError('Channel not found');

        const code = await repo.createEventCode({ channelId: channel.id, code: body.code });

        res.status(201).json({ id: code.id, code: code.code, status: code.status });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersWatchLinksRouter(): Router {
  return router;
}


