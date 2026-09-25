/**
 * Owner Payments (Noctusoft store marketplace) Routes.
 */

import express, { type Router } from 'express';

import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getMarketplaceConfig } from '../lib/marketplace';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import type { IMarketplaceStoreOnboarding } from '../services/MarketplaceStoreService';
import { MarketplaceStoreService } from '../services/MarketplaceStoreService';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:4300';

function postConnectRedirect(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/dashboard?payments_connected=true`;
}

let storeServiceInstance: IMarketplaceStoreOnboarding | null = null;

function getStoreService(): IMarketplaceStoreOnboarding {
  if (!storeServiceInstance) {
    storeServiceInstance = new MarketplaceStoreService(getMarketplaceConfig());
  }
  return storeServiceInstance;
}

export function setMarketplaceStoreService(service: IMarketplaceStoreOnboarding): void {
  storeServiceInstance = service;
}

router.post('/me/payments/connect', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

      const repo = new OwnerAccountRepository(prisma);
      const owner = await repo.findById(req.ownerAccountId);
      if (!owner) return next(new NotFoundError('Owner account not found'));

      const sellerKey = owner.marketplaceSellerKey || owner.id;
      if (!owner.marketplaceSellerKey) {
        await repo.update(owner.id, { marketplaceSellerKey: sellerKey });
      }

      const onboardingUrl = await getStoreService().buildOnboardingUrl(sellerKey, postConnectRedirect());
      res.json({ onboardingUrl, sellerKey });
    } catch (error) {
      next(error);
    }
  })();
});

router.get('/me/payments/status', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

      const repo = new OwnerAccountRepository(prisma);
      const owner = await repo.findById(req.ownerAccountId);
      if (!owner) return next(new NotFoundError('Owner account not found'));

      const sellerKey = owner.marketplaceSellerKey || null;
      let connected = false;
      let merchantId: string | null = null;
      if (sellerKey) {
        const status = await getStoreService().getSellerStatus(sellerKey);
        connected = status.connected;
        merchantId = status.merchantId;
        if (connected && !owner.paymentsConnectedAt) {
          await repo.update(owner.id, { paymentsConnectedAt: new Date(), payoutProviderRef: merchantId ?? owner.payoutProviderRef });
        }
      }

      res.json({
        sellerKey,
        merchantId,
        connected,
        connectedAt: owner.paymentsConnectedAt ? owner.paymentsConnectedAt.toISOString() : null,
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersPaymentsRouter(): Router {
  return router;
}
