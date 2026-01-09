import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { validateAdminToken } from '../middleware/admin-jwt';
import { 
  SavePaymentMethodSchema, 
  GetPaymentMethodsQuerySchema,
  DirectStreamCheckoutSchema  // 🆕
} from '@fieldview/data-model';
// 🆕 Payment service dependencies
import { PaymentService } from '../services/PaymentService';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';

const router = Router();

// 🆕 Lazy initialization for PaymentService
let paymentServiceInstance: PaymentService | null = null;

function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const watchLinkRepo = new WatchLinkRepository(prisma);
    paymentServiceInstance = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      watchLinkRepo
    );
  }
  return paymentServiceInstance;
}

// GET /api/direct/:slug/bootstrap - Get bootstrap data for direct stream page
router.get(
  '/:slug/bootstrap',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const key = slug.toLowerCase();
        
        // Try to find existing DirectStream in DB
        let directStream = await prisma.directStream.findUnique({
          where: { slug: key },
          include: { game: true },
        });

        // If not found, create a placeholder
        if (!directStream) {
          // Get default owner account for new streams
          const defaultOwner = await prisma.ownerAccount.findFirst({
            select: { id: true },
          });

          if (!defaultOwner) {
            return res.status(500).json({ error: 'No owner account found. Please create an owner account first.' });
          }

          // Find or create a game for chat
          let gameId: string | null = null;
          
          const existingGame = await prisma.game.findFirst({
            where: { title: `Direct Stream: ${slug}` },
            select: { id: true },
          });

          if (existingGame) {
            gameId = existingGame.id;
          } else {
              const newGame = await prisma.game.create({
                data: {
                  ownerAccountId: defaultOwner.id,
                  title: `Direct Stream: ${slug}`,
                  homeTeam: slug,
                  awayTeam: 'TBD',
                  startsAt: new Date(),
                  priceCents: 0,
                  currency: 'USD',
                  keywordCode: `DIRECT-${slug.toUpperCase()}-${Date.now()}`,
                  qrUrl: '',
                  state: 'live',
                },
              });
            gameId = newGame.id;
          }

          // Hash a default admin password (admin2026)
          const defaultHashedPassword = await bcrypt.hash('admin2026', 10);

          // Create DirectStream record
          directStream = await prisma.directStream.create({
            data: {
              slug: key,
              title: `Direct Stream: ${slug}`,
              ownerAccountId: defaultOwner.id,  // 🆕 Required field
              adminPassword: defaultHashedPassword,
              gameId,
              chatEnabled: true,
              paywallEnabled: false,
              priceInCents: 0,
            },
            include: { game: true },
          });
        }

        return res.json({
          slug: directStream.slug,
          gameId: directStream.gameId,
          streamUrl: directStream.streamUrl,
          chatEnabled: directStream.chatEnabled,
          title: directStream.title,
          paywallEnabled: directStream.paywallEnabled,
          priceInCents: directStream.priceInCents,
          paywallMessage: directStream.paywallMessage,
          allowSavePayment: directStream.allowSavePayment,
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get bootstrap data');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug/unlock-admin - Unlock admin panel with password, return JWT
router.post(
  '/:slug/unlock-admin',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        // Validate request body
        const schema = z.object({
          password: z.string().min(1, 'Password is required'),
        });
        
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ 
            error: 'Invalid request', 
            details: parsed.error.errors 
          });
        }

        const { password } = parsed.data;
        const key = slug.toLowerCase();

        // Find the DirectStream record
        const directStream = await prisma.directStream.findUnique({
          where: { slug: key },
        });

        if (!directStream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Verify password with bcrypt
        const isValid = await bcrypt.compare(password, directStream.adminPassword);
        
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          logger.error('JWT_SECRET not configured');
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
          { slug: key, role: 'admin' },
          jwtSecret,
          { expiresIn: '1h' }
        );

        return res.json({ token });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to unlock admin');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug/settings - Update admin settings (JWT protected)
router.post(
  '/:slug/settings',
  validateAdminToken, // Middleware validates JWT
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        // Validate request body (password no longer required)
        const schema = z.object({
          streamUrl: z.string().url().optional().nullable(),
          chatEnabled: z.boolean().optional(),
          paywallEnabled: z.boolean().optional(),
          priceInCents: z.number().int().min(0).max(99999).optional(),
          paywallMessage: z.string().max(1000).optional().nullable(),
          allowSavePayment: z.boolean().optional(),
        });
        
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ 
            error: 'Invalid request', 
            details: parsed.error.errors 
          });
        }

        const body = parsed.data;
        const key = slug.toLowerCase();

        // Find existing DirectStream
        const existingStream = await prisma.directStream.findUnique({
          where: { slug: key },
        });

        if (!existingStream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Build update data (ISP: only update provided fields)
        const updateData: any = {};
        
        if (body.streamUrl !== undefined) {
          updateData.streamUrl = body.streamUrl;
        }
        if (body.paywallEnabled !== undefined) {
          updateData.paywallEnabled = body.paywallEnabled;
        }
        if (body.priceInCents !== undefined) {
          updateData.priceInCents = body.priceInCents;
        }
        if (body.paywallMessage !== undefined) {
          updateData.paywallMessage = body.paywallMessage;
        }
        if (body.allowSavePayment !== undefined) {
          updateData.allowSavePayment = body.allowSavePayment;
        }
        if (body.chatEnabled !== undefined) {
          updateData.chatEnabled = body.chatEnabled;
        }

        // Update in database
        const updated = await prisma.directStream.update({
          where: { slug: key },
          data: updateData,
        });

        logger.info({ slug, updates: Object.keys(updateData) }, 'Direct stream settings updated');

        return res.json({
          success: true,
          settings: {
            streamUrl: updated.streamUrl,
            paywallEnabled: updated.paywallEnabled,
            priceInCents: updated.priceInCents,
            paywallMessage: updated.paywallMessage,
            allowSavePayment: updated.allowSavePayment,
            chatEnabled: updated.chatEnabled,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error({ error, slug: req.params.slug }, 'Failed to update settings');
        next(error);
      }
    })();
  }
);

// Legacy endpoints (kept for backwards compatibility, deprecated)
// GET /api/direct/:slug - Get current stream URL (legacy, keep for compatibility)
router.get(
  '/:slug',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const key = slug.toLowerCase();
        const directStream = await prisma.directStream.findUnique({
          where: { slug: key },
          select: { streamUrl: true },
        });

        if (directStream && directStream.streamUrl) {
          return res.json({ streamUrl: directStream.streamUrl });
        }

        res.status(404).json({ error: 'No stream configured' });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get stream URL');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug - Update stream URL (legacy, use /settings instead)
router.post(
  '/:slug',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const { streamUrl, password } = req.body;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }
        
        if (!streamUrl || typeof streamUrl !== 'string') {
          return res.status(400).json({ error: 'streamUrl is required' });
        }

        const key = slug.toLowerCase();
        
        // Find existing stream to validate password
        const existingStream = await prisma.directStream.findUnique({
          where: { slug: key },
        });

        if (existingStream) {
          // Validate password for existing stream
          if (!password) {
            return res.status(401).json({ error: 'Password required' });
          }
          const isValid = await bcrypt.compare(password, existingStream.adminPassword);
          if (!isValid) {
            logger.warn({ slug }, 'Invalid password attempt (legacy endpoint)');
          return res.status(401).json({ error: 'Invalid password' });
          }
          
          // Update existing stream
          const updated = await prisma.directStream.update({
            where: { slug: key },
            data: { streamUrl },
          });
          
          logger.info({ slug, streamUrl }, 'Direct stream URL updated (legacy endpoint)');
          return res.json({ success: true, streamUrl: updated.streamUrl });
        }
        
        // Create new stream (requires ownerAccount)
        const defaultOwner = await prisma.ownerAccount.findFirst({
          select: { id: true },
        });

        if (!defaultOwner) {
          return res.status(500).json({ error: 'No owner account found' });
        }

        const defaultHashedPassword = await bcrypt.hash(password || 'admin2026', 10);
        
        const updated = await prisma.directStream.create({
          data: {
            slug: key,
            title: `Direct Stream: ${slug}`,
            streamUrl,
            chatEnabled: true,
            ownerAccountId: defaultOwner.id,
            adminPassword: defaultHashedPassword,
          },
        });

        logger.info({ slug, streamUrl }, 'Direct stream URL updated (legacy endpoint)');

        res.json({ success: true, streamUrl: updated.streamUrl });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to update stream URL (legacy)');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug/checkout - Create DirectStream paywall checkout session
router.post(
  '/:slug/checkout',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }
        
        // Validate request body
        const validation = DirectStreamCheckoutSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          });
        }

        const { email, firstName, lastName, phone, returnUrl } = validation.data;

        // Get payment service
        const paymentService = getPaymentService();

        // Create checkout session
        const result = await paymentService.createDirectStreamCheckout(
          slug,
          email,
          firstName,
          lastName,
          phone,
          returnUrl
        );

        logger.info({ 
          slug, 
          email, 
          purchaseId: result.purchaseId 
        }, 'DirectStream checkout session created');

        res.json(result);
      } catch (error: any) {
        logger.error({ 
          error, 
          slug: req.params.slug,
          email: req.body?.email
        }, 'Failed to create checkout session');
        
        // Return user-friendly error messages
        if (error.name === 'NotFoundError') {
          return res.status(404).json({ error: error.message });
        }
        if (error.name === 'BadRequestError') {
          return res.status(400).json({ error: error.message });
        }
        
        next(error);
      }
    })();
  }
);

// GET /api/direct/:slug/payment-methods - Get saved payment methods for email
router.get(
  '/:slug/payment-methods',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        const validation = GetPaymentMethodsQuerySchema.safeParse(req.query);
        if (!validation.success) {
          return res.status(400).json({ error: 'Email parameter is required' });
        }

        const { email } = validation.data;

        // Check if stream exists
        const stream = await prisma.directStream.findUnique({
          where: { slug },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Find viewer by email
        const viewer = await prisma.viewerIdentity.findUnique({
          where: { email },
        });

        if (!viewer) {
          return res.json({ hasSavedCard: false });
        }

        // Find square customer for this viewer
        const squareCustomer = await prisma.viewerSquareCustomer.findFirst({
          where: { viewerId: viewer.id },
        });

        if (!squareCustomer) {
          return res.json({ hasSavedCard: false });
        }

        // Find most recent purchase with saved card info
        const recentPurchase = await prisma.purchase.findFirst({
          where: {
            viewerId: viewer.id,
            savePaymentMethod: true,
            cardLastFour: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!recentPurchase) {
          return res.json({ hasSavedCard: false });
        }

        res.json({
          hasSavedCard: true,
          cardLastFour: recentPurchase.cardLastFour,
          cardBrand: recentPurchase.cardBrand,
          squareCustomerId: squareCustomer.squareCustomerId,
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get payment methods');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug/save-payment-method - Save payment method for viewer
router.post(
  '/:slug/save-payment-method',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;

        const validation = SavePaymentMethodSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request',
            details: validation.error.errors,
          });
        }

        const { email, firstName, lastName, squareCustomerId } = validation.data;

        // Check if stream exists
        const stream = await prisma.directStream.findUnique({
          where: { slug },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Find or create owner account (for ViewerSquareCustomer relation)
        const owner = await prisma.ownerAccount.findFirst({
          select: { id: true },
        });

        if (!owner) {
          return res.status(500).json({ error: 'No owner account found' });
        }

        // Find or create viewer
        let viewer = await prisma.viewerIdentity.findUnique({
          where: { email },
        });

        if (!viewer) {
          viewer = await prisma.viewerIdentity.create({
            data: {
              email,
              firstName: firstName || '',
              lastName: lastName || '',
            },
          });
        }

        // Upsert ViewerSquareCustomer
        const existingSquareCustomer = await prisma.viewerSquareCustomer.findFirst({
          where: {
            viewerId: viewer.id,
            ownerAccountId: owner.id,
          },
        });

        if (existingSquareCustomer) {
          await prisma.viewerSquareCustomer.update({
            where: { id: existingSquareCustomer.id },
            data: { squareCustomerId },
          });

          return res.json({ success: true, updated: true });
        } else {
          await prisma.viewerSquareCustomer.create({
            data: {
              viewerId: viewer.id,
              ownerAccountId: owner.id,
              squareCustomerId,
            },
          });

          return res.status(201).json({ success: true, created: true });
        }
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to save payment method');
        next(error);
      }
    })();
  }
);

// GET /api/direct/:slug/viewers/active - Get active viewers (last 2 minutes)
router.get(
  '/:slug/viewers/active',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;

        // Check if stream exists
        const stream = await prisma.directStream.findUnique({
          where: { slug },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Get viewers active within last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        
        const activeViewers = await prisma.viewerIdentity.findMany({
          where: {
            lastSeenAt: {
              gte: twoMinutesAgo,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            lastSeenAt: true,
          },
          orderBy: {
            lastSeenAt: 'desc',
          },
        });

        // Mark viewers as active or inactive based on 1-minute threshold
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const viewersWithStatus = activeViewers.map((viewer) => ({
          ...viewer,
          isActive: viewer.lastSeenAt ? viewer.lastSeenAt >= oneMinuteAgo : false,
        }));

        res.json({
          viewers: viewersWithStatus,
          totalActive: viewersWithStatus.length,
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get active viewers');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug/heartbeat - Update viewer activity timestamp
router.post(
  '/:slug/heartbeat',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const { email, firstName, lastName } = req.body;

        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        // Check if stream exists
        const stream = await prisma.directStream.findUnique({
          where: { slug },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Upsert viewer with updated lastSeenAt
        await prisma.viewerIdentity.upsert({
          where: { email: email.toLowerCase().trim() },
          update: {
            lastSeenAt: new Date(),
          },
          create: {
            email: email.toLowerCase().trim(),
            firstName: firstName || '',
            lastName: lastName || '',
            lastSeenAt: new Date(),
          },
        });

        res.json({ success: true });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to update heartbeat');
        next(error);
      }
    })();
  }
);

export function createDirectRouter(): Router {
  return router;
}


