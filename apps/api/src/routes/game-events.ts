/**
 * Crowdsourced game-event routes
 *
 * POST   /api/direct/:slug/events
 * POST   /api/direct/:slug/events/:id/confirm
 * POST   /api/direct/:slug/events/:id/resolve
 * GET    /api/direct/:slug/events
 * POST   /api/public/direct/:slug/score-alerts  (mounted separately below via same router? No — this file is under /api/direct)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  ReportGameEventBodySchema,
  ResolveGameEventSchema,
} from '@fieldview/data-model';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { comparePassword } from '../lib/encryption';
import { gameEventRateLimit } from '../middleware/rateLimit';
import {
  requireViewerAuth,
  requireViewerId,
  type ViewerAuthRequest,
} from '../middleware/viewer-auth';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { GameEventService } from '../services/GameEventService';
import { GameEventRepository } from '../repositories/implementations/GameEventRepository';
import { ChatRepository } from '../repositories/implementations/ChatRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import {
  ChatEventWriterAdapter,
  PrismaScoreboardMutator,
  ScoreAlertFanoutAdapter,
  ScoreboardBroadcasterAdapter,
} from '../repositories/implementations/GameEventAdapters';
import { getGameEventPubSub } from '../lib/game-event-pubsub';
import { SmsService } from '../services/SmsService';

const router: Router = Router();

function parentSlug(slug: string): string {
  const key = slug.toLowerCase();
  const parts = key.split('/');
  return parts.length >= 2 ? parts[0] : key;
}

let service: GameEventService | null = null;

function getService(): GameEventService {
  if (!service) {
    const repo = new GameEventRepository(prisma);
    const chatRepo = new ChatRepository(prisma);
    const gameRepo = new GameRepository(prisma);
    const viewerRepo = new ViewerIdentityRepository(prisma);
    const sms = new SmsService(gameRepo, viewerRepo, viewerRepo);
    service = new GameEventService(
      repo,
      repo,
      repo,
      repo,
      new PrismaScoreboardMutator(prisma),
      new ChatEventWriterAdapter(chatRepo),
      getGameEventPubSub(),
      new ScoreboardBroadcasterAdapter(),
      new ScoreAlertFanoutAdapter(prisma, sms)
    );
  }
  return service;
}

function requireSlugMatch(req: ViewerAuthRequest, _res: Response, next: NextFunction): void {
  const routeSlug = parentSlug(req.params.slug);
  if (req.slug && parentSlug(req.slug) !== routeSlug) {
    return next(new ForbiddenError('Token not valid for this stream'));
  }
  next();
}

async function requireProducer(req: Request, slug: string): Promise<string> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { verifyAdminJwt } = await import('../lib/admin-jwt');
      const decoded = verifyAdminJwt(authHeader.substring(7));
      if (decoded && decoded.slug === slug && decoded.role === 'admin') {
        return 'Admin';
      }
    } catch {
      // fall through to password
    }
  }

  const stream = await prisma.directStream.findUnique({
    where: { slug },
    include: { scoreboard: true },
  });
  if (!stream) throw new NotFoundError('Stream not found');
  if (!stream.scoreboard?.producerPassword) {
    return 'Producer';
  }
  const password = (req.body as { producerPassword?: string }).producerPassword;
  if (!password) throw new UnauthorizedError('Producer password required');
  const ok = await comparePassword(password, stream.scoreboard.producerPassword);
  if (!ok) throw new UnauthorizedError('Invalid password');
  return 'Producer';
}

/**
 * GET /api/direct/:slug/events
 */
router.get('/:slug/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = parentSlug(req.params.slug);
    const status = req.query.status as 'pending' | 'confirmed' | 'rejected' | undefined;
    const events = await getService().list(slug, status);
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/direct/:slug/events
 */
router.post(
  '/:slug/events',
  requireViewerAuth,
  requireSlugMatch,
  gameEventRateLimit,
  async (req: ViewerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = ReportGameEventBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid event');
      }
      const result = await getService().report({
        slug: parentSlug(req.params.slug),
        viewerId: requireViewerId(req),
        displayName: req.displayName ?? 'Viewer',
        eventTypeId: parsed.data.eventTypeId,
        team: parsed.data.team,
        clockSeconds: parsed.data.clockSeconds,
        jerseyNumber: parsed.data.jerseyNumber,
        detail: parsed.data.detail,
        detailValue: parsed.data.detailValue,
        note: parsed.data.note,
        filmTimeSeconds: parsed.data.filmTimeSeconds,
      });
      logger.info(
        { slug: req.params.slug, eventId: result.event.id, viewerId: req.viewerId },
        'Game event reported'
      );
      res.status(201).json(result.payload);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/direct/:slug/events/:id/confirm
 */
router.post(
  '/:slug/events/:id/confirm',
  requireViewerAuth,
  requireSlugMatch,
  async (req: ViewerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getService().confirm({
        slug: parentSlug(req.params.slug),
        eventId: req.params.id,
        viewerId: requireViewerId(req),
      });
      res.json(result.payload);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/direct/:slug/events/:id/resolve
 */
router.post(
  '/:slug/events/:id/resolve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = parentSlug(req.params.slug);
      const parsed = ResolveGameEventSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('action must be confirm or reject');
      }
      const resolverName = await requireProducer(req, slug);
      const result = await getService().resolve({
        slug,
        eventId: req.params.id,
        action: parsed.data.action,
        resolverName,
      });
      res.json(result.payload);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/direct/:slug/score-alerts
 * Opt in to SMS score alerts for this stream.
 */
router.post('/:slug/score-alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = parentSlug(req.params.slug);
    const phoneE164 = String((req.body as { phoneE164?: string }).phoneE164 ?? '').trim();
    const consent = (req.body as { consent?: boolean }).consent === true;
    if (!/^\+[1-9]\d{1,14}$/.test(phoneE164)) {
      throw new BadRequestError('Valid E.164 phone number required');
    }
    if (!consent) {
      throw new BadRequestError('Consent is required to receive SMS alerts');
    }

    const stream = await prisma.directStream.findUnique({ where: { slug } });
    if (!stream) throw new NotFoundError('Stream not found');

    let viewer = await prisma.viewerIdentity.findFirst({ where: { phoneE164 } });
    if (!viewer) {
      viewer = await prisma.viewerIdentity.create({
        data: {
          email: `sms-${phoneE164.replace(/\D/g, '')}@alerts.fieldview.live`,
          phoneE164,
        },
      });
    }

    const existing = await prisma.subscription.findFirst({
      where: { viewerId: viewer.id, directStreamId: stream.id, status: 'active' },
    });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          viewerId: viewer.id,
          directStreamId: stream.id,
          preference: 'sms',
          confirmed: true,
          confirmedAt: new Date(),
          status: 'active',
        },
      });
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
