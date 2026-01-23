/**
 * Express API Server
 * 
 * Main server setup with middleware and routes.
 */

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import cron from 'node-cron';

import { logger } from './lib/logger';
import { initSentry } from './lib/sentry';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import { sendStreamReminders } from './jobs/send-stream-reminders';
import { autoPurgeDeletedStreams } from './jobs/auto-purge-streams';
import { createAdminRouter } from './routes/admin';
import { createAdminCouponsRouter } from './routes/admin.coupons';
import { createAdminPlatformRouter } from './routes/admin.platform';
import { createAdminSetupRouter } from './routes/admin.setup';
import { createHealthRouter } from './routes/health';
import { createOwnersRouter } from './routes/owners';
import { createOwnersAnalyticsRouter } from './routes/owners.analytics';
import { createOwnersGamesRouter } from './routes/owners.games';
import { createOwnersMeRouter } from './routes/owners.me';
import { createOwnersSquareRouter } from './routes/owners.square';
import { createOwnersStreamsRouter } from './routes/owners.streams';
import { createOwnersWatchLinksRouter } from './routes/owners.watch-links';
import { createOwnersEventsRouter } from './routes/owners.events';
import { createOwnersMembersRouter } from './routes/owners.members';
import { createOwnersLedgerRouter } from './routes/owners.ledger';
import { createPublicRouter } from './routes/public.checkout';
import { createPublicSubscriptionsRouter } from './routes/public.subscriptions';
import { createPublicGamesRouter } from './routes/public.games';
import { createPublicPurchasesRouter } from './routes/public.purchases';
import { createPublicSavedPaymentsRouter } from './routes/public.saved-payments';
import { createWatchRouter } from './routes/public.watch';
import { createPublicWatchLinksRouter } from './routes/public.watch-links';
import { createStreamLinksRouter } from './routes/stream-links';
import { createDirectRouter } from './routes/direct';
import { createDirectLifecycleRouter } from './routes/direct-lifecycle';
import { createDirectViewerRouter } from './routes/public.direct-viewer';
import { createPublicDirectRegistrationRouter } from './routes/public.direct-registration';
import { createAdminDirectStreamsRouter } from './routes/admin.direct-streams';
import { createAdminDirectStreamEventsRouter } from './routes/admin.direct-stream-events';
import { createAdminSeedRouter } from './routes/admin.seed';
import { createPublicGameViewerRouter } from './routes/public.game-viewer';
import { createPublicGameChatRouter } from './routes/public.game-chat';
import { createPublicCouponsRouter } from './routes/public.coupons';
import { createPublicDirectStreamEventsRouter } from './routes/public.direct-stream-events';
import { createEarlyAccessRouter } from './routes/early-access';
import scoreboardRouter from './routes/scoreboard';
import { createTestCleanupRouter } from './routes/test.cleanup';
import { createTestStreamsRouter } from './routes/test.streams';
import { createSquareWebhookRouter } from './routes/webhooks.square';
import { createTwilioWebhookRouter } from './routes/webhooks.twilio';
import clipsRouter from './routes/clips.routes';
import bookmarksRouter from './routes/bookmarks.routes';
import recordingsRouter from './routes/recordings.routes';
import versionRouter from './routes/version';
import { redisClient } from './lib/redis';

// Initialize Sentry error tracking (optional, requires SENTRY_DSN env var)
initSentry();

const app: Express = express();
const PORT = process.env.PORT || 4301;

// Trust proxy (Railway/NGINX) so req.protocol/host are correct for webhooks
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.squarecdn.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://api.squareup.com',
          'https://connect.squareup.com',
          'https://mux.com',
          'https://*.mux.com',
        ],
        frameSrc: ["'self'", 'https://js.squarecdn.com'],
      },
    },
  })
);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4300'];
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Middleware
app.use(express.json({
  verify: (req, _res, buf) => {
    // Preserve raw body for webhook signature verification (Square requires exact bytes)
    (req as unknown as { rawBody?: Buffer }).rawBody = buf;
  },
}));
app.use(pinoHttp({ logger }));

// Routes
app.use('/', createHealthRouter());
app.use('/api', versionRouter);
app.use('/api/admin', createAdminRouter());
app.use('/api/admin/coupons', createAdminCouponsRouter());
app.use('/api/admin/platform', createAdminPlatformRouter());
app.use('/api/admin/setup', createAdminSetupRouter());
app.use('/api/admin/direct-streams', createAdminDirectStreamsRouter());
app.use('/api/admin/direct-streams', createAdminDirectStreamEventsRouter());
app.use('/api/admin/seed', createAdminSeedRouter());
app.use('/api/owners', createOwnersRouter());
app.use('/api/owners', createOwnersAnalyticsRouter());
app.use('/api/owners', createOwnersGamesRouter());
app.use('/api/owners', createOwnersMeRouter());
app.use('/api/owners', createOwnersSquareRouter());
app.use('/api/owners', createOwnersStreamsRouter());
app.use('/api/owners', createOwnersWatchLinksRouter());
app.use('/api/owners', createOwnersEventsRouter());
app.use('/api/owners', createOwnersMembersRouter());
app.use('/api/owners', createOwnersLedgerRouter());
app.use('/api/public', createPublicRouter());
app.use('/api/public', createPublicSubscriptionsRouter());
app.use('/api/public', createPublicGamesRouter());
app.use('/api/public', createPublicPurchasesRouter());
app.use('/api/public', createPublicSavedPaymentsRouter());
app.use('/api/public', createPublicWatchLinksRouter());
app.use('/api/public', createWatchRouter());
app.use('/api/public', createDirectViewerRouter());
app.use('/api/public/direct', createPublicDirectRegistrationRouter());
app.use('/api/public', createPublicGameViewerRouter());
app.use('/api/public', createPublicGameChatRouter());
app.use('/api/public/direct', createPublicDirectStreamEventsRouter());
app.use('/api/public/coupons', createPublicCouponsRouter());
app.use('/api/early-access', createEarlyAccessRouter());
// Note: Subscription routes are mounted at /api/public, so routes defined as '/subscriptions' become /api/public/subscriptions
app.use('/api/streams', createStreamLinksRouter());
app.use('/api/direct', createDirectRouter());
app.use('/api/direct', createDirectLifecycleRouter());
app.use('/api/direct', scoreboardRouter);
app.use('/api/clips', clipsRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/webhooks', createTwilioWebhookRouter());
app.use('/api/webhooks', createSquareWebhookRouter());

// Test routes (POC/development only)
const enableTestRoutes = process.env.ENABLE_TEST_ROUTES === '1' || process.env.NODE_ENV !== 'production';
if (enableTestRoutes) {
  app.use('/api/test/streams', createTestStreamsRouter());
  app.use('/api/test/cleanup', createTestCleanupRouter());
}

// Error handling (must be last)
app.use(errorHandler);

// Initialize cron jobs
// Run stream reminder job every minute
cron.schedule('* * * * *', async () => {
  try {
    await sendStreamReminders();
  } catch (error) {
    logger.error({ error }, 'Stream reminder cron job failed');
  }
});

// Run auto-purge job daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  try {
    await autoPurgeDeletedStreams();
  } catch (error) {
    logger.error({ error }, 'Auto-purge cron job failed');
  }
});

logger.info('Cron jobs initialized: stream reminders (every minute), auto-purge (daily at 3 AM)');

// Initialize cleanup jobs (DVR video cleanup)
import { initializeCleanupJobs } from './jobs/cleanup';
initializeCleanupJobs();

// Startup validation (fail fast if critical dependencies are unavailable)
async function validateStartup(): Promise<void> {
  // Validate required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  
  if (missingVars.length > 0) {
    logger.error({ missing: missingVars }, 'Missing required environment variables');
    process.exit(1);
  }

  // Test database connection before accepting requests (with timeout)
  try {
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout (10s)')), 10000)
    );
    await Promise.race([
      (async () => {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
      })(),
      dbTimeout,
    ]);
    logger.info('Database connection verified at startup');
  } catch (error) {
    logger.error({ error }, 'Database connection failed at startup - server will not start');
    process.exit(1);
  }

  // Test Redis connection (non-critical, warn only)
  if (process.env.REDIS_URL) {
    try {
      const redisTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout (5s)')), 5000)
      );
      await Promise.race([redisClient.ping(), redisTimeout]);
      logger.info('Redis connection verified at startup');
    } catch (error) {
      logger.warn({ error }, 'Redis connection failed at startup (non-critical, continuing)');
    }
  } else {
    logger.warn('REDIS_URL not set - rate limiting will use in-memory store');
  }
}

// Start server - use multiple checks for module detection compatibility
const isMainModule = require.main === module || 
  process.argv[1]?.includes('server') ||
  !process.env.VITEST;

if (isMainModule) {
  // Validate startup before listening
  void validateStartup().then(() => {
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'API server started');
    });
  }).catch((error) => {
    logger.error({ error }, 'Startup validation failed');
    process.exit(1);
  });
}

export default app;
export { app };
