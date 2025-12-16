/**
 * Express API Server
 * 
 * Main server setup with middleware and routes.
 */

import express, { type Express } from 'express';
import pinoHttp from 'pino-http';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { createAdminRouter } from './routes/admin';
import { createHealthRouter } from './routes/health';
import { createOwnersRouter } from './routes/owners';
import { createOwnersAnalyticsRouter } from './routes/owners.analytics';
import { createOwnersGamesRouter } from './routes/owners.games';
import { createOwnersMeRouter } from './routes/owners.me';
import { createOwnersSquareRouter } from './routes/owners.square';
import { createOwnersStreamsRouter } from './routes/owners.streams';
import { createPublicRouter } from './routes/public.checkout';
import { createPublicGamesRouter } from './routes/public.games';
import { createPublicPurchasesRouter } from './routes/public.purchases';
import { createWatchRouter } from './routes/public.watch';
import { createSquareWebhookRouter } from './routes/webhooks.square';
import { createTwilioWebhookRouter } from './routes/webhooks.twilio';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.use('/api', createHealthRouter());
app.use('/api/admin', createAdminRouter());
app.use('/api/owners', createOwnersRouter());
app.use('/api/owners', createOwnersAnalyticsRouter());
app.use('/api/owners', createOwnersGamesRouter());
app.use('/api/owners', createOwnersMeRouter());
app.use('/api/owners', createOwnersSquareRouter());
app.use('/api/owners', createOwnersStreamsRouter());
app.use('/api/public', createPublicRouter());
app.use('/api/public', createPublicGamesRouter());
app.use('/api/public', createPublicPurchasesRouter());
app.use('/api/public', createWatchRouter());
app.use('/api/webhooks', createTwilioWebhookRouter());
app.use('/api/webhooks', createSquareWebhookRouter());

// Error handling (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server started');
  });
}

export default app;
