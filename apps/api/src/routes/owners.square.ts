/**
 * Owner Square Connect Routes
 * 
 * Square Connect onboarding endpoints.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { SquareService } from '../services/SquareService';

const router = express.Router();

// Lazy initialization
let squareServiceInstance: SquareService | null = null;

function getSquareService(): SquareService {
  if (!squareServiceInstance) {
    const ownerAccountRepo = new OwnerAccountRepository(prisma);
    squareServiceInstance = new SquareService(ownerAccountRepo);
  }
  return squareServiceInstance;
}

// Export for testing
export function setSquareService(service: SquareService): void {
  squareServiceInstance = service;
}

// Generate connect URL schema
const GenerateConnectUrlSchema = z.object({
  returnUrl: z.string().url().optional(),
});

/**
 * POST /api/owners/square/connect
 * 
 * Generate Square Connect onboarding URL.
 */
router.post(
  '/square/connect',
  requireOwnerAuth,
  validateRequest({ body: GenerateConnectUrlSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const squareService = getSquareService();
        const returnUrl = (req.body as { returnUrl?: string })?.returnUrl || 'http://localhost:3000/dashboard';
        const result = await squareService.generateConnectUrl(req.ownerAccountId, returnUrl);

        res.json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/square/callback
 * 
 * Handle Square Connect callback.
 */
router.get(
  '/square/callback',
  async (req, res, next) => {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing code or state' } });
      }

      const squareService = getSquareService();
      const result = await squareService.handleConnectCallback(code, state);

      // Redirect to success page
      res.redirect(`http://localhost:3000/dashboard?square_connected=true&merchant_id=${result.merchantId}`);
    } catch (error) {
      next(error);
    }
  }
);

export function createOwnersSquareRouter(): Router {
  return router;
}
