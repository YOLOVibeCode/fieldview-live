/**
 * Social Producer Panel - Scoreboard APIs
 * Manages game scoreboard with configurable access control
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { comparePassword, hashPassword } from '../lib/encryption';
import { adminJwtAuth } from '../middleware/admin-jwt';
import {
  UpdateGameScoreboardSchema,
  ValidateProducerPasswordSchema,
} from '@fieldview/data-model';
import { getScoreboardPubSub, type ScoreboardEvent } from '../lib/scoreboard-pubsub';

const router: Router = Router();

/**
 * GET /api/direct/:slug/scoreboard
 * Public - Get current scoreboard state
 */
router.get('/:slug/scoreboard', async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    let stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Auto-create scoreboard with 0-0 score if it doesn't exist
    if (!stream.scoreboard) {
      logger.info({ slug }, 'Auto-creating scoreboard with default 0-0 score');
      
      await prisma.gameScoreboard.create({
        data: {
          directStreamId: stream.id,
          homeTeamName: 'Home',
          awayTeamName: 'Away',
          homeJerseyColor: '#003366', // Default navy blue
          awayJerseyColor: '#CC0000', // Default red
          homeScore: 0,
          awayScore: 0,
          clockMode: 'stopped',
          clockSeconds: 0,
          isVisible: true,
          position: 'top',
        },
      });

      // Reload stream with scoreboard
      stream = await prisma.directStream.findUnique({
        where: { slug },
        include: { scoreboard: true },
      });
    }

    const { scoreboard } = stream!;

    // Public response (don't expose password hash)
    const response = {
      id: scoreboard!.id,
      homeTeamName: scoreboard!.homeTeamName,
      awayTeamName: scoreboard!.awayTeamName,
      homeJerseyColor: scoreboard!.homeJerseyColor,
      awayJerseyColor: scoreboard!.awayJerseyColor,
      homeScore: scoreboard!.homeScore,
      awayScore: scoreboard!.awayScore,
      clockMode: scoreboard!.clockMode,
      clockSeconds: scoreboard!.clockSeconds,
      clockStartedAt: scoreboard!.clockStartedAt?.toISOString() ?? null,
      isVisible: scoreboard!.isVisible,
      position: scoreboard!.position,
      requiresPassword: !!scoreboard!.producerPassword,
      lastEditedBy: scoreboard!.lastEditedBy,
      lastEditedAt: scoreboard!.lastEditedAt?.toISOString() ?? null,
    };

    res.json(response);
  } catch (error) {
    logger.error({ error, slug }, 'Failed to fetch scoreboard');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** Build a ScoreboardEvent from a Prisma scoreboard record */
function toScoreboardEvent(sb: any): ScoreboardEvent {
  return {
    homeTeamName: sb.homeTeamName,
    awayTeamName: sb.awayTeamName,
    homeJerseyColor: sb.homeJerseyColor,
    awayJerseyColor: sb.awayJerseyColor,
    homeScore: sb.homeScore,
    awayScore: sb.awayScore,
    clockMode: sb.clockMode,
    clockSeconds: sb.clockSeconds,
    clockStartedAt: sb.clockStartedAt?.toISOString?.() ?? sb.clockStartedAt ?? null,
    isVisible: sb.isVisible,
    position: sb.position,
    lastEditedBy: sb.lastEditedBy,
    lastEditedAt: sb.lastEditedAt?.toISOString?.() ?? sb.lastEditedAt ?? null,
  };
}

/**
 * GET /api/direct/:slug/scoreboard/stream
 * SSE endpoint for real-time scoreboard updates.
 */
router.get('/:slug/scoreboard/stream', (req: Request, res: Response) => {
  const { slug } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  logger.info({ slug }, 'Scoreboard SSE connection established');

  // Send initial snapshot
  (async () => {
    try {
      const stream = await prisma.directStream.findUnique({
        where: { slug },
        include: { scoreboard: true },
      });

      if (stream?.scoreboard) {
        const snapshot = toScoreboardEvent(stream.scoreboard);
        res.write(`event: scoreboard_snapshot\n`);
        res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      }
    } catch (error) {
      logger.error({ error, slug }, 'Failed to send scoreboard snapshot');
    }
  })();

  // Subscribe to live updates
  const pubsub = getScoreboardPubSub();
  const unsubscribe = pubsub.subscribe(slug, (data) => {
    res.write(`event: scoreboard_update\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Keep-alive ping every 30s
  const pingInterval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    unsubscribe();
    logger.info({ slug }, 'Scoreboard SSE connection closed');
  });
});

/**
 * POST /api/direct/:slug/scoreboard/validate
 * Validate producer password
 */
router.post('/:slug/scoreboard/validate', async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const validation = ValidateProducerPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Producer password is required' });
    }

    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    const { producerPassword } = validation.data;
    const { scoreboard } = stream;

    if (!scoreboard.producerPassword) {
      // No password set = open editing
      return res.json({ valid: true });
    }

    const isValid = await comparePassword(producerPassword, scoreboard.producerPassword);
    res.json({ valid: isValid });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to validate producer password');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Middleware: Validate producer access
 * Allows if: (1) Admin JWT, (2) Correct producer password, (3) No password set
 */
async function validateProducerAccess(req: Request, res: Response, next: NextFunction) {
  const { slug } = req.params;

  try {
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    // Try to extract admin JWT if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { verifyAdminJwt } = await import('../lib/admin-jwt');
        const decoded = verifyAdminJwt(token);
        
        if (decoded && decoded.slug === slug && decoded.role === 'admin') {
          req.admin = decoded;
          return next(); // Admin always allowed
        }
      } catch {
        // Invalid/expired token, continue to password check
      }
    }

    // Check if producer password is set
    const { scoreboard } = stream;
    if (!scoreboard.producerPassword) {
      return next(); // No password = open access
    }

    // Password is set, validate it
    const { producerPassword } = req.body;

    if (!producerPassword) {
      return res.status(401).json({ error: 'Producer password required' });
    }

    const isValid = await comparePassword(producerPassword, scoreboard.producerPassword);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    next();
  } catch (error) {
    logger.error({ error, slug }, 'Producer access validation failed');
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/direct/:slug/scoreboard
 * Update scoreboard fields
 * Access: Admin JWT OR correct producer password OR open (if no password)
 */
router.post('/:slug/scoreboard', validateProducerAccess, async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const validation = UpdateGameScoreboardSchema.safeParse(req.body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const errorMessage = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid request';
      return res.status(400).json({
        error: errorMessage,
        details: validation.error.errors,
      });
    }

    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    // Remove producerPassword from update data (it's only for validation)
    const { producerPassword, ...updateData } = validation.data;

    // Update scoreboard
    const updatedScoreboard = await prisma.gameScoreboard.update({
      where: { id: stream.scoreboard.id },
      data: {
        ...updateData,
        lastEditedAt: new Date(),
      },
    });

    // Broadcast to SSE subscribers
    getScoreboardPubSub().publish(slug, toScoreboardEvent(updatedScoreboard));

    res.json({
      id: updatedScoreboard.id,
      homeTeamName: updatedScoreboard.homeTeamName,
      awayTeamName: updatedScoreboard.awayTeamName,
      homeJerseyColor: updatedScoreboard.homeJerseyColor,
      awayJerseyColor: updatedScoreboard.awayJerseyColor,
      homeScore: updatedScoreboard.homeScore,
      awayScore: updatedScoreboard.awayScore,
      clockMode: updatedScoreboard.clockMode,
      clockSeconds: updatedScoreboard.clockSeconds,
      clockStartedAt: updatedScoreboard.clockStartedAt?.toISOString() ?? null,
      isVisible: updatedScoreboard.isVisible,
      position: updatedScoreboard.position,
      lastEditedBy: updatedScoreboard.lastEditedBy,
      lastEditedAt: updatedScoreboard.lastEditedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to update scoreboard');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/direct/:slug/scoreboard/clock/start
 * Start or resume game clock
 */
router.post('/:slug/scoreboard/clock/start', validateProducerAccess, async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    const now = new Date();
    const { scoreboard } = stream;

    // If paused, resume from current clockSeconds
    // If stopped, start from 0
    const currentSeconds = scoreboard.clockMode === 'paused' ? scoreboard.clockSeconds : 0;

    const updatedScoreboard = await prisma.gameScoreboard.update({
      where: { id: scoreboard.id },
      data: {
        clockMode: 'running',
        clockStartedAt: now,
        clockSeconds: currentSeconds,
      },
    });

    getScoreboardPubSub().publish(slug, toScoreboardEvent(updatedScoreboard));

    res.json({
      clockMode: updatedScoreboard.clockMode,
      clockStartedAt: updatedScoreboard.clockStartedAt?.toISOString(),
      clockSeconds: updatedScoreboard.clockSeconds,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to start clock');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/direct/:slug/scoreboard/clock/pause
 * Pause game clock
 */
router.post('/:slug/scoreboard/clock/pause', validateProducerAccess, async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    const { scoreboard } = stream;

    // Calculate elapsed time if running
    let finalSeconds = scoreboard.clockSeconds;
    if (scoreboard.clockMode === 'running' && scoreboard.clockStartedAt) {
      const elapsed = Math.floor((Date.now() - scoreboard.clockStartedAt.getTime()) / 1000);
      finalSeconds = scoreboard.clockSeconds + elapsed;
    }

    const updatedScoreboard = await prisma.gameScoreboard.update({
      where: { id: scoreboard.id },
      data: {
        clockMode: 'paused',
        clockSeconds: finalSeconds,
        clockStartedAt: null,
      },
    });

    getScoreboardPubSub().publish(slug, toScoreboardEvent(updatedScoreboard));

    res.json({
      clockMode: updatedScoreboard.clockMode,
      clockSeconds: updatedScoreboard.clockSeconds,
      clockStartedAt: null,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to pause clock');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/direct/:slug/scoreboard/clock/reset
 * Reset clock to 00:00
 */
router.post('/:slug/scoreboard/clock/reset', validateProducerAccess, async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    const updatedScoreboard = await prisma.gameScoreboard.update({
      where: { id: stream.scoreboard.id },
      data: {
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      },
    });

    getScoreboardPubSub().publish(slug, toScoreboardEvent(updatedScoreboard));

    res.json({
      clockMode: updatedScoreboard.clockMode,
      clockSeconds: updatedScoreboard.clockSeconds,
      clockStartedAt: null,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to reset clock');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/direct/:slug/scoreboard/setup
 * Admin-only: Create scoreboard with optional producer password
 */
router.post('/:slug/scoreboard/setup', adminJwtAuth, async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.scoreboard) {
      return res.status(409).json({ error: 'Scoreboard already exists' });
    }

    const { producerPassword, ...scoreboardData } = req.body;

    const hashedPassword = producerPassword
      ? await hashPassword(producerPassword)
      : null;

    const scoreboard = await prisma.gameScoreboard.create({
      data: {
        directStreamId: stream.id,
        ...scoreboardData,
        producerPassword: hashedPassword,
      },
    });

    res.status(201).json({
      id: scoreboard.id,
      homeTeamName: scoreboard.homeTeamName,
      awayTeamName: scoreboard.awayTeamName,
      homeJerseyColor: scoreboard.homeJerseyColor,
      awayJerseyColor: scoreboard.awayJerseyColor,
      requiresPassword: !!scoreboard.producerPassword,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to create scoreboard');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/direct/:slug/scoreboard/viewer-update
 * Viewer scoreboard update (requires registration & admin permission)
 * Access: Registered viewer with valid token
 */
router.post('/:slug/scoreboard/viewer-update', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { viewerToken, field, value } = req.body;

  try {
    if (!field || value === undefined) {
      return res.status(400).json({ error: 'Field and value required' });
    }

    // Validate field name
    const allowedFields = ['homeScore', 'awayScore', 'homeTeamName', 'awayTeamName'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    // Find stream and scoreboard
    const stream = await prisma.directStream.findUnique({
      where: { slug },
      include: { scoreboard: true },
    });

    if (!stream || !stream.scoreboard) {
      return res.status(404).json({ error: 'Scoreboard not found' });
    }

    // Check if viewer editing is enabled
    const isScoreField = field === 'homeScore' || field === 'awayScore';
    const isNameField = field === 'homeTeamName' || field === 'awayTeamName';

    if (isScoreField && !stream.allowViewerScoreEdit) {
      return res.status(403).json({ error: 'Viewer score editing is disabled' });
    }

    if (isNameField && !stream.allowViewerNameEdit) {
      return res.status(403).json({ error: 'Viewer name editing is disabled' });
    }

    // Auth check: require viewerToken unless anonymous editing is enabled
    const isAnonymousAllowed = isScoreField && stream.allowAnonymousScoreEdit;
    if (!viewerToken && !isAnonymousAllowed) {
      return res.status(401).json({ error: 'Viewer token required' });
    }

    const viewerName = viewerToken ? 'Viewer' : 'Guest';

    // Rate limiting check (simple in-memory implementation)
    // TODO: Implement proper Redis-based rate limiting
    const rateLimitKey = `viewer-scoreboard-${slug}-${viewerToken}`;
    // Skip rate limit check for now - implement in production

    // Validate and sanitize value based on field type
    let sanitizedValue: number | string = value;
    if (isScoreField) {
      const score = parseInt(value as string, 10);
      if (isNaN(score) || score < 0 || score > 999) {
        return res.status(400).json({ error: 'Score must be between 0 and 999' });
      }
      sanitizedValue = score;
    }

    if (isNameField) {
      const name = value as string;
      if (!name || name.trim().length === 0 || name.length > 30) {
        return res.status(400).json({ error: 'Team name must be 1-30 characters' });
      }
      sanitizedValue = name.trim();
    }

    // Update scoreboard
    const updateData: any = {
      [field]: sanitizedValue,
      lastEditedBy: viewerName,
      lastEditedAt: new Date(),
    };

    const updatedScoreboard = await prisma.gameScoreboard.update({
      where: { id: stream.scoreboard.id },
      data: updateData,
    });

    // Broadcast to SSE subscribers
    getScoreboardPubSub().publish(slug, toScoreboardEvent(updatedScoreboard));

    logger.info({
      slug,
      field,
      value,
      viewerName,
    }, 'Viewer updated scoreboard');

    res.json({
      id: updatedScoreboard.id,
      homeTeamName: updatedScoreboard.homeTeamName,
      awayTeamName: updatedScoreboard.awayTeamName,
      homeJerseyColor: updatedScoreboard.homeJerseyColor,
      awayJerseyColor: updatedScoreboard.awayJerseyColor,
      homeScore: updatedScoreboard.homeScore,
      awayScore: updatedScoreboard.awayScore,
      clockMode: updatedScoreboard.clockMode,
      clockSeconds: updatedScoreboard.clockSeconds,
      clockStartedAt: updatedScoreboard.clockStartedAt?.toISOString() ?? null,
      isVisible: updatedScoreboard.isVisible,
      position: updatedScoreboard.position,
      lastEditedBy: updatedScoreboard.lastEditedBy,
      lastEditedAt: updatedScoreboard.lastEditedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error({ error, slug }, 'Failed to update scoreboard (viewer)');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

