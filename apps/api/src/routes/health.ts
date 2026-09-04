/**
 * Liveness endpoint — cheap process-up check for load balancers and Railway.
 */

import express, { type Request, Response, Router } from 'express';

export function createHealthRouter(): Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  return router;
}
