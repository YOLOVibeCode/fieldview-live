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
  DirectStreamCheckoutSchema,
  DirectStreamSettingsUpdateSchema,
  getStreamStatus 
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
        
        // Try to find existing DirectStream in DB (only active streams)
        let directStream = await prisma.directStream.findUnique({
          where: { slug: key },
          include: { game: true },
        });

        // Check if stream is deleted or archived
        if (directStream && directStream.status !== 'active') {
          return res.status(410).json({ 
            error: 'Stream not available',
            status: directStream.status,
            message: directStream.status === 'archived' 
              ? 'This stream has been archived' 
              : 'This stream has been deleted'
          });
        }

        // AUTO-HEAL: If DirectStream exists but has no gameId, try to link an existing Game
        if (directStream && !directStream.gameId) {
          const existingGame = await prisma.game.findFirst({
            where: { title: `Direct Stream: ${slug}` },
            select: { id: true },
          });

          if (existingGame) {
            // Link the existing Game to the DirectStream
            directStream = await prisma.directStream.update({
              where: { slug: key },
              data: { gameId: existingGame.id },
              include: { game: true },
            });
            logger.info({ slug, gameId: existingGame.id }, 'Auto-linked existing Game to DirectStream');
          }
        }

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

          // Special configuration for e2e-test demo stream
          const isE2ETest = key === 'e2e-test';

          // Create DirectStream record
          directStream = await prisma.directStream.create({
            data: {
              slug: key,
              title: isE2ETest ? 'E2E Test Demo Stream' : `Direct Stream: ${slug}`,
              ownerAccountId: defaultOwner.id,  // 🆕 Required field
              adminPassword: defaultHashedPassword,
              gameId,
              chatEnabled: true,
              paywallEnabled: false,
              priceInCents: 0,
              scoreboardEnabled: isE2ETest ? true : false, // Enable scoreboard for e2e-test
              scoreboardHomeTeam: isE2ETest ? 'Demo Home' : null,
              scoreboardAwayTeam: isE2ETest ? 'Demo Away' : null,
              scoreboardHomeColor: isE2ETest ? '#3B82F6' : null,
              scoreboardAwayColor: isE2ETest ? '#EF4444' : null,
            },
            include: { game: true },
          });
        }

        // ISP: Segregate page config from stream config
        const pageConfig = {
          slug: directStream.slug,
          title: directStream.title,
          gameId: directStream.gameId,
          chatEnabled: directStream.chatEnabled,
          scoreboardEnabled: directStream.scoreboardEnabled,
          paywallEnabled: directStream.paywallEnabled,
          priceInCents: directStream.priceInCents,
          paywallMessage: directStream.paywallMessage,
          allowSavePayment: directStream.allowSavePayment,
          scoreboardHomeTeam: directStream.scoreboardHomeTeam,
          scoreboardAwayTeam: directStream.scoreboardAwayTeam,
          scoreboardHomeColor: directStream.scoreboardHomeColor,
          scoreboardAwayColor: directStream.scoreboardAwayColor,
          allowViewerScoreEdit: directStream.allowViewerScoreEdit,
          allowViewerNameEdit: directStream.allowViewerNameEdit,
        };

        // Get stream status (null if not configured)
        const streamConfig = getStreamStatus(directStream.streamUrl);

        return res.json({
          // ISP: New decoupled structure
          page: pageConfig,
          stream: streamConfig,
          
          // Backward compatibility: flat fields for old clients
          slug: directStream.slug,
          gameId: directStream.gameId,
          streamUrl: directStream.streamUrl,
          chatEnabled: directStream.chatEnabled,
          title: directStream.title,
          paywallEnabled: directStream.paywallEnabled,
          priceInCents: directStream.priceInCents,
          paywallMessage: directStream.paywallMessage,
          allowSavePayment: directStream.allowSavePayment,
          scoreboardEnabled: directStream.scoreboardEnabled,
          scoreboardHomeTeam: directStream.scoreboardHomeTeam,
          scoreboardAwayTeam: directStream.scoreboardAwayTeam,
          scoreboardHomeColor: directStream.scoreboardHomeColor,
          scoreboardAwayColor: directStream.scoreboardAwayColor,
          allowViewerScoreEdit: directStream.allowViewerScoreEdit,
          allowViewerNameEdit: directStream.allowViewerNameEdit,
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

        // ISP: Use decoupled settings schema
        const parsed = DirectStreamSettingsUpdateSchema.safeParse(req.body);
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
        
        // Fault-tolerant stream URL validation
        if (body.streamUrl !== undefined) {
          if (body.streamUrl === null || body.streamUrl === '') {
            // Allow clearing stream URL
            updateData.streamUrl = null;
            logger.info({ slug }, 'Stream URL cleared by admin');
          } else {
            // Validate URL format (non-blocking)
            try {
              new URL(body.streamUrl);
              updateData.streamUrl = body.streamUrl;
              logger.info({ slug, streamUrl: body.streamUrl }, 'Stream URL updated');
            } catch {
              // Invalid URL: log warning but don't fail entire update
              logger.warn({ slug, streamUrl: body.streamUrl }, 'Invalid stream URL format, skipping URL update');
              // Don't add to updateData - other settings will still save
            }
          }
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
        if (body.scoreboardEnabled !== undefined) {
          updateData.scoreboardEnabled = body.scoreboardEnabled;
        }
        if (body.scoreboardHomeTeam !== undefined) {
          updateData.scoreboardHomeTeam = body.scoreboardHomeTeam;
        }
        if (body.scoreboardAwayTeam !== undefined) {
          updateData.scoreboardAwayTeam = body.scoreboardAwayTeam;
        }
        if (body.scoreboardHomeColor !== undefined) {
          updateData.scoreboardHomeColor = body.scoreboardHomeColor;
        }
        if (body.scoreboardAwayColor !== undefined) {
          updateData.scoreboardAwayColor = body.scoreboardAwayColor;
        }
        // 🆕 Viewer editing permissions
        if (body.allowViewerScoreEdit !== undefined) {
          updateData.allowViewerScoreEdit = body.allowViewerScoreEdit;
        }
        if (body.allowViewerNameEdit !== undefined) {
          updateData.allowViewerNameEdit = body.allowViewerNameEdit;
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
            scoreboardEnabled: updated.scoreboardEnabled,
            scoreboardHomeTeam: updated.scoreboardHomeTeam,
            scoreboardAwayTeam: updated.scoreboardAwayTeam,
            scoreboardHomeColor: updated.scoreboardHomeColor,
            scoreboardAwayColor: updated.scoreboardAwayColor,
            // 🆕 Viewer editing permissions
            allowViewerScoreEdit: updated.allowViewerScoreEdit,
            allowViewerNameEdit: updated.allowViewerNameEdit,
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
        console.log('[CHECKOUT] Route hit! slug:', req.params.slug);
        console.log('[CHECKOUT] Body:', JSON.stringify(req.body, null, 2));
        
        const { slug } = req.params;
        
        if (!slug) {
          console.log('[CHECKOUT] ERROR: No slug');
          return res.status(400).json({ error: 'Slug is required' });
        }
        
        // Validate request body
        console.log('[CHECKOUT] Validating request body...');
        const validation = DirectStreamCheckoutSchema.safeParse(req.body);
        if (!validation.success) {
          console.log('[CHECKOUT] Validation failed:', validation.error);
          return res.status(400).json({ 
            error: 'Invalid request',
            details: validation.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
          });
        }

        const { email, firstName, lastName, phone, returnUrl } = validation.data;
        console.log('[CHECKOUT] Validation passed. Getting payment service...');

        // Get payment service
        const paymentService = getPaymentService();
        console.log('[CHECKOUT] Payment service obtained. Creating checkout...');

        // Create checkout session
        const result = await paymentService.createDirectStreamCheckout(
          slug,
          email,
          firstName,
          lastName,
          phone,
          returnUrl
        );

        console.log('[CHECKOUT] Checkout created successfully:', result.purchaseId);

        logger.info({ 
          slug, 
          email, 
          purchaseId: result.purchaseId 
        }, 'DirectStream checkout session created');

        res.json(result);
      } catch (error: any) {
        // Enhanced error logging for debugging
        console.error('[CHECKOUT ERROR] Full error:', error);
        console.error('[CHECKOUT ERROR] Error stack:', error.stack);
        console.error('[CHECKOUT ERROR] Error name:', error.name);
        console.error('[CHECKOUT ERROR] Error message:', error.message);
        
        logger.error({ 
          error, 
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
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
        const viewersWithStatus = activeViewers.map((viewer: any) => ({
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

// GET /api/direct/:slug/verify-access - Verify viewer has paid access to stream
router.get(
  '/:slug/verify-access',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const { viewerId, email } = req.query as { viewerId?: string; email?: string };

        logger.info({ slug, viewerId, email }, 'Verifying stream access');

        // 1. Find DirectStream
        const stream = await prisma.directStream.findUnique({
          where: { slug },
          select: {
            id: true,
            gameId: true,
            paywallEnabled: true,
            ownerAccountId: true,
          },
        });

        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found',
            hasAccess: false,
            reason: 'stream_not_found',
          });
        }

        // 2. If paywall not enabled, allow access
        if (!stream.paywallEnabled) {
          logger.info({ slug }, 'Stream has no paywall, access granted');
          return res.json({
            hasAccess: true,
            reason: 'no_paywall',
          });
        }

        // 3. Find viewer
        let viewer = null;
        if (viewerId) {
          viewer = await prisma.viewerIdentity.findUnique({
            where: { id: viewerId },
            select: { id: true, email: true },
          });
        } else if (email) {
          viewer = await prisma.viewerIdentity.findUnique({
            where: { email },
            select: { id: true, email: true },
          });
        }

        if (!viewer) {
          logger.info({ slug, viewerId, email }, 'Viewer not found, access denied');
          return res.json({
            hasAccess: false,
            reason: 'viewer_not_found',
          });
        }

        // 4. Check for valid entitlement
        // Entitlement must be:
        // - For this viewer (through purchase)
        // - For this direct stream
        // - Not expired (validTo >= now)
        const entitlement = await prisma.entitlement.findFirst({
          where: {
            purchase: {
              viewerId: viewer.id,
              directStreamId: stream.id,
            },
            status: 'active',
            validTo: { gte: new Date() }, // Not expired
          },
          select: {
            id: true,
            validFrom: true,
            validTo: true,
            tokenId: true,
          },
          orderBy: { validFrom: 'desc' }, // Most recent first
        });

        if (entitlement) {
          logger.info({
            slug,
            viewerId: viewer.id,
            entitlementId: entitlement.id,
          }, 'Valid entitlement found, access granted');
          
          return res.json({
            hasAccess: true,
            reason: 'valid_entitlement',
            entitlement: {
              id: entitlement.id,
              validFrom: entitlement.validFrom,
              validTo: entitlement.validTo,
              tokenId: entitlement.tokenId,
            },
          });
        }

        // 5. No valid entitlement found
        logger.info({
          slug,
          viewerId: viewer.id,
          gameId: stream.gameId,
        }, 'No valid entitlement found, access denied');
        
        return res.json({
          hasAccess: false,
          reason: 'no_entitlement',
        });

      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Verify access failed');
        next(error);
      }
    })();
  }
);

export function createDirectRouter(): Router {
  return router;
}


