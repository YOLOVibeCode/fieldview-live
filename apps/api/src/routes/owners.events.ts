/**
 * Owner Event Routes
 *
 * Coach/team manager endpoints for creating and managing events.
 */

import { CreateEventSchema, UpdateEventSchema } from '@fieldview/data-model';
import express, { type Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { EventRepository } from '../repositories/implementations/EventRepository';
import { MembershipRepository } from '../repositories/implementations/MembershipRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
import type { IEventReaderRepo } from '../repositories/IEventRepository';
import type { IWatchLinkReaderRepo } from '../repositories/IWatchLinkRepository';
import { AuthorizationService } from '../services/AuthorizationService';
import { CoachEventService } from '../services/CoachEventService';
import { EventKeyGenerator } from '../services/EventKeyGenerator';
import type { INotificationService } from '../services/INotificationService';
import { LinkTemplateRenderer } from '../services/LinkTemplateRenderer';
import { NotificationService } from '../services/NotificationService';

const router = express.Router();

async function getOwnerUserId(req: AuthRequest): Promise<string> {
  if (!req.ownerAccountId) throw new Error('Owner account ID not found');
  // Get the first owner user for this account (typically there's one primary user)
  const ownerUser = await prisma.ownerUser.findFirst({
    where: { ownerAccountId: req.ownerAccountId },
  });
  if (!ownerUser) throw new Error('Owner user not found');
  return ownerUser.id;
}

// Initialize services
const eventRepo = new EventRepository(prisma);
const membershipRepo = new MembershipRepository(prisma);
const watchLinkRepo = new WatchLinkRepository(prisma);
const authService = new AuthorizationService(membershipRepo, eventRepo);
const eventKeyGenerator = new EventKeyGenerator(eventRepo);
const linkTemplateRenderer = new LinkTemplateRenderer();
const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
const notificationService = new NotificationService(viewerIdentityRepo);
const coachEventService = new CoachEventService(
  authService,
  eventKeyGenerator,
  linkTemplateRenderer,
  eventRepo,
  watchLinkRepo
);

/**
 * POST /api/owners/me/orgs/:orgShortName/channels/:teamSlug/events
 * Create a new event for a channel.
 */
router.post(
  '/me/orgs/:orgShortName/channels/:teamSlug/events',
  requireOwnerAuth,
  validateRequest({ body: CreateEventSchema }),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { orgShortName, teamSlug } = req.params;
        if (!orgShortName || !teamSlug) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'orgShortName and teamSlug are required' } });
        }

        // Get organization and channel
        const org = await watchLinkRepo.getOrganizationByShortName(orgShortName);
        if (!org) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
        }

        const channel = await watchLinkRepo.getChannelByOrgIdAndTeamSlug(org.id, teamSlug);
        if (!channel) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }

        const body = req.body as z.infer<typeof CreateEventSchema>;

        const event = await coachEventService.createEvent(ownerUserId, {
          organizationId: org.id,
          channelId: channel.id,
          startsAt: body.startsAt,
          urlKey: body.urlKey,
          canonicalPath: body.canonicalPath,
          streamType: body.streamType ?? null,
          muxPlaybackId: body.muxPlaybackId ?? null,
          hlsManifestUrl: body.hlsManifestUrl ?? null,
          externalEmbedUrl: body.externalEmbedUrl ?? null,
          externalProvider: body.externalProvider ?? null,
          accessMode: body.accessMode ?? null,
          priceCents: body.priceCents ?? null,
          currency: body.currency ?? 'USD',
        });

        res.status(201).json({
          id: event.id,
          organizationId: event.organizationId,
          channelId: event.channelId,
          startsAt: event.startsAt,
          urlKey: event.urlKey,
          canonicalPath: event.canonicalPath,
          state: event.state,
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
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/owners/me/events/:eventId
 * Update an event (reschedule, update stream source, etc.).
 */
router.patch(
  '/me/events/:eventId',
  requireOwnerAuth,
  validateRequest({ body: UpdateEventSchema }),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'eventId is required' } });
        }

        const body = req.body as z.infer<typeof UpdateEventSchema>;

        const event = await coachEventService.updateEvent(ownerUserId, eventId, {
          startsAt: body.startsAt,
          streamType: body.streamType ?? null,
          muxPlaybackId: body.muxPlaybackId ?? null,
          hlsManifestUrl: body.hlsManifestUrl ?? null,
          externalEmbedUrl: body.externalEmbedUrl ?? null,
          externalProvider: body.externalProvider ?? null,
          accessMode: body.accessMode ?? null,
          priceCents: body.priceCents ?? null,
          currency: body.currency,
        });

        res.json({
          id: event.id,
          organizationId: event.organizationId,
          channelId: event.channelId,
          startsAt: event.startsAt,
          urlKey: event.urlKey,
          canonicalPath: event.canonicalPath,
          state: event.state,
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
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/events/:eventId/go-live
 * Mark an event as live and trigger notifications.
 */
router.post(
  '/me/events/:eventId/go-live',
  requireOwnerAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'eventId is required' } });
        }

        const event = await coachEventService.setEventLive(ownerUserId, eventId);

        // Trigger notifications to subscribers
        await notifySubscribersForEvent(eventId, notificationService, watchLinkRepo, eventRepo);

        const eventRecord = await eventRepo.getEventById(eventId);
        res.json({
          id: event.id,
          state: event.state,
          wentLiveAt: eventRecord?.wentLiveAt ?? null,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/me/events/:eventId
 * Get event details.
 */
router.get(
  '/me/events/:eventId',
  requireOwnerAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'eventId is required' } });
        }

        const event = await eventRepo.getEventById(eventId);
        if (!event) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
        }

        // Check authorization
        await authService.assertCanManageEvent(ownerUserId, eventId);

        res.json({
          id: event.id,
          organizationId: event.organizationId,
          channelId: event.channelId,
          startsAt: event.startsAt,
          urlKey: event.urlKey,
          canonicalPath: event.canonicalPath,
          state: event.state,
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
          cancelledAt: event.cancelledAt,
          wentLiveAt: event.wentLiveAt,
          endedAt: event.endedAt,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * Helper function to notify subscribers when an event goes live.
 */
async function notifySubscribersForEvent(
  eventId: string,
  notificationService: INotificationService,
  watchLinkRepo: IWatchLinkReaderRepo,
  eventRepo: IEventReaderRepo
): Promise<void> {
  const event = await eventRepo.getEventById(eventId);
  if (!event) return;

  const channel = await watchLinkRepo.getChannelById(event.channelId);
  const organization = await watchLinkRepo.getOrganizationById(event.organizationId);
  if (!channel || !organization) return;

  // Fetch subscribers from Subscription model
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
      confirmed: true,
      OR: [
        { organizationId: event.organizationId },
        { channelId: event.channelId },
        { eventId: event.id },
      ],
    },
    include: {
      viewer: true,
    },
  });

  if (subscriptions.length === 0) return;

  const notificationTargets = subscriptions
    .map((sub: any) => ({
      email: sub.viewer.email,
      phoneE164: sub.viewer.phoneE164 ?? undefined,
      preference: sub.preference as 'email' | 'sms' | 'both',
    }))
    .filter((t: any) => t.email || t.phoneE164);

  await notificationService.notifyEventLive(notificationTargets, {
    eventId: event.id,
    canonicalPath: event.canonicalPath,
    orgShortName: organization.shortName,
    teamSlug: channel.teamSlug,
    isPayPerView: event.accessMode === 'pay_per_view',
    checkoutUrl: event.accessMode === 'pay_per_view' && event.priceCents ? `${APP_URL}/checkout/event/${event.id}` : undefined,
  });
}

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

export function createOwnersEventsRouter(): Router {
  return router;
}

