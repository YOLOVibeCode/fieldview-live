/**
 * Admin DirectStreamEvent Routes
 * 
 * Endpoints for Super Admin to manage events
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { DirectStreamEventRepository } from '../repositories/DirectStreamEventRepository';
import { DirectStreamEventService } from '../services/DirectStreamEventService';
import { validateRequest } from '../middleware/validation';
import { requireAdminAuth } from '../middleware/adminAuth';
import {
  CreateDirectStreamEventSchema,
  UpdateDirectStreamEventSchema,
  ListDirectStreamEventsQuerySchema,
} from '@fieldview/data-model';
import { logger } from '../lib/logger';

export function createAdminDirectStreamEventsRouter(): Router {
  const router = Router();
  
  // Initialize service
  const eventRepo = new DirectStreamEventRepository(prisma);
  const eventService = new DirectStreamEventService(eventRepo, eventRepo);

/**
 * GET /api/admin/direct-streams/:directStreamId/events
 * 
 * List all events for a parent stream
 */
router.get(
  '/:directStreamId/events',
  requireAdminAuth,
  validateRequest({ query: ListDirectStreamEventsQuerySchema }),
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { directStreamId } = req.params;
        if (!directStreamId) {
          return res.status(400).json({ error: 'directStreamId is required' });
        }
        
        const filters = req.query;
        
        logger.info({ directStreamId, filters }, 'Listing events for parent stream');
        
        const events = await eventService.listEvents(directStreamId, filters);
        
        // Enrich with registration counts
        const enriched = await Promise.all(
          events.map(async (event) => ({
            ...event,
            registrationsCount: await eventService.countRegistrations(event.id),
          }))
        );
        
        res.json({ events: enriched });
      } catch (error: any) {
        logger.error({ error }, 'Failed to list events');
        next(error);
      }
    })();
  }
);

/**
 * POST /api/admin/direct-streams/:directStreamId/events
 * 
 * Create a new event
 */
router.post(
  '/:directStreamId/events',
  requireAdminAuth,
  validateRequest({ body: CreateDirectStreamEventSchema }),
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { directStreamId } = req.params;
        if (!directStreamId) {
          return res.status(400).json({ error: 'directStreamId is required' });
        }
        
        const input = { ...req.body, directStreamId };
        
        logger.info({ input }, 'Creating new event');
        
        const event = await eventService.createEvent(input);
        
        res.status(201).json({ event });
      } catch (error: any) {
        logger.error({ error }, 'Failed to create event');
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/admin/direct-streams/:directStreamId/events/:eventId
 * 
 * Update an existing event
 */
router.patch(
  '/:directStreamId/events/:eventId',
  requireAdminAuth,
  validateRequest({ body: UpdateDirectStreamEventSchema }),
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required' });
        }
        
        const input = req.body;
        
        logger.info({ eventId, input }, 'Updating event');
        
        const event = await eventService.updateEvent(eventId, input);
        
        res.json({ event });
      } catch (error: any) {
        logger.error({ error }, 'Failed to update event');
        next(error);
      }
    })();
  }
);

/**
 * POST /api/admin/direct-streams/:directStreamId/events/:eventId/archive
 * 
 * Archive an event
 */
router.post(
  '/:directStreamId/events/:eventId/archive',
  requireAdminAuth,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required' });
        }
        
        logger.info({ eventId }, 'Archiving event');
        
        const event = await eventService.archiveEvent(eventId);
        
        res.json({ event });
      } catch (error: any) {
        logger.error({ error }, 'Failed to archive event');
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/admin/direct-streams/:directStreamId/events/:eventId
 * 
 * Delete an event (soft or hard)
 */
router.delete(
  '/:directStreamId/events/:eventId',
  requireAdminAuth,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { eventId } = req.params;
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required' });
        }
        
        const { hard } = req.query;
        
        logger.info({ eventId, hard }, 'Deleting event');
        
        await eventService.deleteEvent(eventId, hard === 'true');
        
        res.json({ message: 'Event deleted successfully' });
      } catch (error: any) {
        logger.error({ error }, 'Failed to delete event');
        next(error);
      }
    })();
  }
  );
  
  return router;
}

