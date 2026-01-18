/**
 * Super Admin DirectStreams Management Routes
 * 
 * Endpoints:
 * - GET /api/admin/direct-streams (list all)
 * - POST /api/admin/direct-streams (create new)
 * - PATCH /api/admin/direct-streams/:id (update)
 * - GET /api/admin/direct-streams/:id/registrations (view registrations)
 * - POST /api/admin/direct-streams/:slug/impersonate (get stream admin JWT)
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import {
  CreateDirectStreamSchema,
  UpdateDirectStreamSchema,
} from '@fieldview/data-model';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/encryption';
import { generateAdminJwt } from '../lib/admin-jwt';
import { logger } from '../lib/logger';
import { DirectStreamRegistrationRepository } from '../repositories/implementations/DirectStreamRegistrationRepository';
import { RegistrationService } from '../services/RegistrationService';
import { EmailVerificationRepository } from '../repositories/implementations/EmailVerificationRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { EmailVerificationService } from '../services/EmailVerificationService';
import { getEmailProvider } from '../lib/email';

const router = express.Router();

// TODO: Add Super Admin authentication middleware in production
// For now, accessible in development for testing

// Initialize services for registrations endpoint
const registrationReader = new DirectStreamRegistrationRepository();
const registrationWriter = new DirectStreamRegistrationRepository();
const tokenReader = new EmailVerificationRepository();
const tokenWriter = new EmailVerificationRepository();
const viewerReader = new ViewerIdentityRepository(prisma);
const viewerWriter = new ViewerIdentityRepository(prisma);
const emailProvider = getEmailProvider();

const verificationService = new EmailVerificationService(
  tokenReader,
  tokenWriter,
  viewerReader,
  viewerWriter,
  emailProvider
);

const registrationService = new RegistrationService(
  registrationReader,
  registrationWriter,
  viewerReader,
  viewerWriter,
  verificationService
);

/**
 * GET /api/admin/direct-streams
 * List all DirectStreams (with filtering, sorting)
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { status, listed, sort } = req.query;

      // Build filter
      const where: any = {};
      if (status && typeof status === 'string') {
        where.status = status;
      }
      if (listed !== undefined) {
        where.listed = listed === 'true';
      }

      // Build orderBy (default: soonest upcoming first)
      let orderBy: any = { scheduledStartAt: 'asc' };
      if (sort === 'created_desc') {
        orderBy = { createdAt: 'desc' };
      } else if (sort === 'title_asc') {
        orderBy = { title: 'asc' };
      }

      const streams = await prisma.directStream.findMany({
        where,
        orderBy,
        include: {
          ownerAccount: {
            select: { id: true, name: true, contactEmail: true },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });

      logger.info({ count: streams.length, status, listed }, 'Listed DirectStreams for Super Admin');

      res.json({
        streams: streams.map((s) => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          status: s.status,
          scheduledStartAt: s.scheduledStartAt,
          paywallEnabled: s.paywallEnabled,
          priceInCents: s.priceInCents,
          chatEnabled: s.chatEnabled,
          scoreboardEnabled: s.scoreboardEnabled,
          listed: s.listed,
          registrationsCount: s._count.registrations,
          ownerAccount: s.ownerAccount,
          createdAt: s.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to list DirectStreams');
      next(error);
    }
  })();
});

/**
 * POST /api/admin/direct-streams
 * Create a new DirectStream
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const validation = CreateDirectStreamSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      const data = validation.data;

      // Check slug uniqueness
      const existing = await prisma.directStream.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        return res.status(409).json({ error: 'Slug already exists' });
      }

      // Hash admin password
      const adminPasswordHash = await hashPassword(data.adminPassword);

      // Get default owner account (for POC)
      const defaultOwner = await prisma.ownerAccount.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultOwner) {
        return res.status(500).json({ error: 'No owner account found. Please create one first.' });
      }

      // 🆕 Auto-create Game record for DirectStream (required for viewer registration/chat)
      const gameTitle = `Direct Stream: ${data.slug}`;
      let game = await prisma.game.findFirst({
        where: { title: gameTitle },
        select: { id: true },
      });

      if (!game) {
        game = await prisma.game.create({
          data: {
            ownerAccountId: defaultOwner.id,
            title: gameTitle,
            homeTeam: data.title || data.slug,
            awayTeam: 'TBD',
            startsAt: data.scheduledStartAt ? new Date(data.scheduledStartAt) : new Date(),
            priceCents: data.priceInCents || 0,
            currency: 'USD',
            keywordCode: `DIRECT-${data.slug.toUpperCase()}-${Date.now()}`,
            qrUrl: '',
            state: 'active',
          },
        });
        logger.info({ gameId: game.id, slug: data.slug }, 'Game auto-created for DirectStream');
      }

      // Create DirectStream with Game link
      const stream = await prisma.directStream.create({
        data: {
          slug: data.slug,
          title: data.title,
          streamUrl: data.streamUrl,
          scheduledStartAt: data.scheduledStartAt ? new Date(data.scheduledStartAt) : null,
          paywallEnabled: data.paywallEnabled,
          priceInCents: data.priceInCents,
          paywallMessage: data.paywallMessage,
          allowSavePayment: data.allowSavePayment,
          adminPassword: adminPasswordHash,
          chatEnabled: data.chatEnabled,
          scoreboardEnabled: data.scoreboardEnabled,
          allowAnonymousView: data.allowAnonymousView,
          requireEmailVerification: data.requireEmailVerification,
          listed: data.listed,
          sendReminders: data.sendReminders,
          reminderMinutes: data.reminderMinutes,
          ownerAccountId: defaultOwner.id,
          gameId: game.id, // 🆕 Link to auto-created Game
        },
        include: {
          ownerAccount: {
            select: { id: true, name: true, contactEmail: true },
          },
          game: {
            select: { id: true, title: true },
          },
        },
      });

      logger.info({ streamId: stream.id, slug: stream.slug }, 'DirectStream created by Super Admin');

      res.status(201).json({
        message: 'DirectStream created successfully',
        stream: {
          id: stream.id,
          slug: stream.slug,
          title: stream.title,
          status: stream.status,
          scheduledStartAt: stream.scheduledStartAt,
          paywallEnabled: stream.paywallEnabled,
          priceInCents: stream.priceInCents,
          ownerAccount: stream.ownerAccount,
          game: stream.game, // 🆕 Include linked Game info
          createdAt: stream.createdAt,
        },
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to create DirectStream');
      next(error);
    }
  })();
});

/**
 * PATCH /api/admin/direct-streams/:id
 * Update a DirectStream
 */
router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { id } = req.params;
      const validation = UpdateDirectStreamSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      const data = validation.data;

      // Build update object
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.streamUrl !== undefined) updateData.streamUrl = data.streamUrl;
      if (data.scheduledStartAt !== undefined)
        updateData.scheduledStartAt = data.scheduledStartAt ? new Date(data.scheduledStartAt) : null;
      if (data.paywallEnabled !== undefined) updateData.paywallEnabled = data.paywallEnabled;
      if (data.priceInCents !== undefined) updateData.priceInCents = data.priceInCents;
      if (data.paywallMessage !== undefined) updateData.paywallMessage = data.paywallMessage;
      if (data.allowSavePayment !== undefined) updateData.allowSavePayment = data.allowSavePayment;
      if (data.chatEnabled !== undefined) updateData.chatEnabled = data.chatEnabled;
      if (data.scoreboardEnabled !== undefined) updateData.scoreboardEnabled = data.scoreboardEnabled;
      if (data.allowAnonymousView !== undefined) updateData.allowAnonymousView = data.allowAnonymousView;
      if (data.requireEmailVerification !== undefined)
        updateData.requireEmailVerification = data.requireEmailVerification;
      if (data.listed !== undefined) updateData.listed = data.listed;
      if (data.sendReminders !== undefined) updateData.sendReminders = data.sendReminders;
      if (data.reminderMinutes !== undefined) updateData.reminderMinutes = data.reminderMinutes;

      const stream = await prisma.directStream.update({
        where: { id },
        data: updateData,
        include: {
          ownerAccount: {
            select: { id: true, name: true, contactEmail: true },
          },
        },
      });

      logger.info({ streamId: stream.id, slug: stream.slug }, 'DirectStream updated by Super Admin');

      res.json({
        message: 'DirectStream updated successfully',
        stream: {
          id: stream.id,
          slug: stream.slug,
          title: stream.title,
          status: stream.status,
          scheduledStartAt: stream.scheduledStartAt,
          paywallEnabled: stream.paywallEnabled,
          priceInCents: stream.priceInCents,
          chatEnabled: stream.chatEnabled,
          scoreboardEnabled: stream.scoreboardEnabled,
          listed: stream.listed,
          ownerAccount: stream.ownerAccount,
          updatedAt: stream.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, 'Failed to update DirectStream');
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'DirectStream not found' });
      }
      next(error);
    }
  })();
});

/**
 * GET /api/admin/direct-streams/:id/registrations
 * View all registrations for a DirectStream
 */
router.get('/:id/registrations', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Stream ID is required' });
      }

      // Verify stream exists
      const stream = await prisma.directStream.findUnique({
        where: { id },
        select: { id: true, title: true },
      });

      if (!stream) {
        return res.status(404).json({ error: 'DirectStream not found' });
      }

      // Get registrations
      const registrations = await registrationService.getRegistrationsByStream(id);

      logger.info({ streamId: id, count: registrations.length }, 'Fetched DirectStream registrations');

      res.json({
        stream: { id: stream.id, title: stream.title },
        registrations,
      });
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, 'Failed to fetch registrations');
      next(error);
    }
  })();
});

/**
 * POST /api/admin/direct-streams/:slug/impersonate
 * Generate a stream admin JWT for impersonation
 */
router.post('/:slug/impersonate', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { slug } = req.params;

      if (!slug) {
        return res.status(400).json({ error: 'Slug is required' });
      }

      // Fetch stream
      const stream = await prisma.directStream.findUnique({
        where: { slug, status: 'active' },
      });

      if (!stream) {
        return res.status(404).json({ error: 'DirectStream not found' });
      }

      // Generate stream admin JWT (1-hour expiry)
      const adminToken = generateAdminJwt({ slug, role: 'admin' });

      logger.info({ slug, streamId: stream.id }, 'Super Admin impersonating stream admin');

      res.json({
        message: 'Stream admin JWT generated',
        slug,
        adminToken,
        expiresIn: '1h',
      });
    } catch (error: any) {
      logger.error({ error, slug: req.params.slug }, 'Failed to impersonate stream admin');
      next(error);
    }
  })();
});

export function createAdminDirectStreamsRouter(): express.Router {
  return router;
}

