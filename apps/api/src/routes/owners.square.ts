/**
 * Owner Square Connect Routes
 * 
 * Square Connect onboarding endpoints.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { SquareService } from '../services/SquareService';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:4300';

function defaultReturnUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/dashboard`;
}

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
        const returnUrl = (req.body as { returnUrl?: string })?.returnUrl || defaultReturnUrl();
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
  (req, res, next) => {
    void (async () => {
      try {
        const { code, state } = req.query;

        if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing code or state' } });
        }

        const squareService = getSquareService();
        const result = await squareService.handleConnectCallback(code, state);

        const redirectUrl = new URL(result.returnUrl || defaultReturnUrl());
        redirectUrl.searchParams.set('square_connected', 'true');
        redirectUrl.searchParams.set('merchant_id', result.merchantId);
        res.redirect(redirectUrl.toString());
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/me/square/status
 *
 * Returns Square connection status for the authenticated owner (no secrets).
 */
router.get('/me/square/status', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) {
        return next(new Error('Owner account ID not found'));
      }

      const ownerAccountRepo = new OwnerAccountRepository(prisma);
      const owner = await ownerAccountRepo.findById(req.ownerAccountId);
      if (!owner) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Owner account not found' } });
      }

      const hasAccessToken = Boolean(owner.squareAccessTokenEncrypted);
      const hasRefreshToken = Boolean(owner.squareRefreshTokenEncrypted);
      const tokenExpiresAt = owner.squareTokenExpiresAt ? owner.squareTokenExpiresAt.toISOString() : null;
      const hasLocationId = Boolean(owner.squareLocationId);
      const isExpired = owner.squareTokenExpiresAt ? owner.squareTokenExpiresAt.getTime() < Date.now() : false;

      res.json({
        connected: hasAccessToken,
        merchantId: owner.payoutProviderRef || null,
        hasRefreshToken,
        tokenExpiresAt,
        isExpired,
        hasLocationId,
        needsReconnect: !hasAccessToken || (isExpired && !hasRefreshToken),
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersSquareRouter(): Router {
  return router;
}
