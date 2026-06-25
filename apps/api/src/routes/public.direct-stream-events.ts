/**
 * Public DirectStreamEvent Routes
 * 
 * Public endpoints for fetching event configuration (bootstrap data)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { DirectStreamEventRepository } from '../repositories/DirectStreamEventRepository';
import { DirectStreamEventService } from '../services/DirectStreamEventService';
import { hasValidStreamEntitlement } from '../lib/stream-entitlement';
import { logger } from '../lib/logger';

export function createPublicDirectStreamEventsRouter(): Router {
  const router = Router();
  
  // Initialize service
  const eventRepo = new DirectStreamEventRepository(prisma);
  const eventService = new DirectStreamEventService(eventRepo, eventRepo);

/**
 * GET /api/public/direct/:slug/events/:eventSlug/bootstrap
 * 
 * Get effective configuration for an event (parent defaults + event overrides merged)
 * 
 * This is the bootstrap data for rendering the event page
 */
router.get(
  '/:slug/events/:eventSlug/bootstrap',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug, eventSlug } = req.params;
        if (!slug || !eventSlug) {
          throw new BadRequestError('slug and eventSlug are required');
        }
        
        logger.info({ slug, eventSlug }, 'Fetching event bootstrap config');
        
        const config = await eventService.getEffectiveConfig(slug, eventSlug);
        
        if (!config) {
          throw new NotFoundError('Event not found');
        }
        
        // Check if event is listed (public) or if viewer has access
        if (!config.allowAnonymousView && !req.query.token) {
          throw new ForbiddenError('Authentication required');
        }
        
        // 🔒 Paywall enforcement (server-side): withhold the playable URL for a
        // paywalled event unless the caller proves entitlement (via viewerId/email).
        // Entitlements are tied to the parent direct stream. Fails closed.
        let deliverStreamUrl: string | null = config.streamUrl ?? null;
        let streamLocked = false;
        if (config.paywallEnabled) {
          const { viewerId, email } = req.query as { viewerId?: string; email?: string };
          const parent = await prisma.directStream.findUnique({
            where: { slug: config.parentSlug },
            select: { id: true },
          });
          const entitled = parent
            ? await hasValidStreamEntitlement(parent.id, { viewerId, email })
            : false;
          if (!entitled) {
            deliverStreamUrl = null;
            streamLocked = true;
          }
        }

        // Transform to Bootstrap format (flat structure expected by frontend)
        const bootstrap = {
          slug: config.parentSlug,
          gameId: null, // Events don't have gameIds yet (future feature)
          streamUrl: deliverStreamUrl,
          streamLocked,
          chatEnabled: config.chatEnabled,
          title: config.title,
          paywallEnabled: config.paywallEnabled,
          priceInCents: config.priceInCents,
          paywallMessage: config.paywallMessage,
          allowSavePayment: false, // Can be added to event model later
          scoreboardEnabled: config.scoreboardEnabled,
          scoreboardHomeTeam: config.scoreboardHomeTeam,
          scoreboardAwayTeam: config.scoreboardAwayTeam,
          scoreboardHomeColor: config.scoreboardHomeColor,
          scoreboardAwayColor: config.scoreboardAwayColor,
          // Viewer editing permissions
          allowViewerScoreEdit: config.allowViewerScoreEdit,
          allowViewerNameEdit: config.allowViewerNameEdit,
          // Anonymous feature flags
          allowAnonymousScoreEdit: config.allowAnonymousScoreEdit,
          allowAnonymousChat: config.allowAnonymousChat,
        };
        
        res.json(bootstrap);
      } catch (error: any) {
        logger.error({ error }, 'Failed to fetch event bootstrap config');
        next(error);
      }
    })();
  }
);

  return router;
}

