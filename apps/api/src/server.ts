/**
 * Express API Server
 * 
 * Main server setup with middleware and routes.
 */

import express, { type Express } from 'express';
import pinoHttp from 'pino-http';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { createHealthRouter } from './routes/health';
import { createOwnersRouter } from './routes/owners';
import { createOwnersGamesRouter } from './routes/owners.games';
import { createOwnersMeRouter } from './routes/owners.me';
import { createOwnersSquareRouter } from './routes/owners.square';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.use('/api', createHealthRouter());
app.use('/api/owners', createOwnersRouter());
app.use('/api/owners', createOwnersMeRouter());
app.use('/api/owners', createOwnersSquareRouter());
app.use('/api/owners', createOwnersGamesRouter());

// Error handling (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server started');
  });
}

export default app;
