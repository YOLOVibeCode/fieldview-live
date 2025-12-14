/**
 * Health Check Endpoint
 * 
 * Returns service health status.
 */

import express, { type Request, Response, Router } from 'express';

export function createHealthRouter(): Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
