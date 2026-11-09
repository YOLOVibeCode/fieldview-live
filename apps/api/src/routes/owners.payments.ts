/**
 * Owner Payments (Noctusoft store marketplace) Routes.
 *
 * Coach onboarding onto the relay's Connect Hub, in the relay's own order:
 *   1. POST /me/payments/agreement — accept the Recipient Agreement; this creates the
 *      coach's seller on the relay (the relay refuses onboarding without it).
 *   2. POST /me/payments/connect   — the relay's signed onboarding link; the coach fills
 *      in the provider's hosted form and comes back to /owners/payments.
 *   3. GET  /me/payments/status    — what the relay knows; stamps or clears
 *      paymentsConnectedAt, which gates paid paywalls (lib/payments-readiness.ts).
 *
 * The seller key is the owner account id. See packages/store-client/VENDORED.md.
 */

import type { OwnerAccount } from '@prisma/client';
import express, { type Router } from 'express';
import { z } from 'zod';

import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { getMarketplaceConfig } from '../lib/marketplace';
import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import type { IMarketplaceStoreOnboarding, MarketplaceSellerStatus } from '../services/MarketplaceStoreService';
import { MarketplaceStoreService } from '../services/MarketplaceStoreService';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:4300';
const AGREEMENT_VERSION = process.env.RELAY_AGREEMENT_VERSION || 'v2';

/** Where the relay sends the coach after the provider's form (an allowed return origin). */
function paymentsReturnUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/payments?payments_connected=true`;
}

/** Prefills the provider's "what do you sell" field (at most 200 characters). */
function productDescriptionFor(owner: Pick<OwnerAccount, 'name'>): string {
  return `Paid live-stream access to ${owner.name} games on FieldView.Live`.slice(0, 200);
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

async function loadOwner(req: AuthRequest): Promise<{ repo: OwnerAccountRepository; owner: OwnerAccount }> {
  if (!req.ownerAccountId) {
    throw new UnauthorizedError('Owner account ID not found');
  }
  const repo = new OwnerAccountRepository(prisma);
  const owner = await repo.findById(req.ownerAccountId);
  if (!owner) {
    throw new NotFoundError('Owner account not found');
  }
  return { repo, owner };
}

async function ensureSellerKey(repo: OwnerAccountRepository, owner: OwnerAccount): Promise<string> {
  if (owner.marketplaceSellerKey) {
    return owner.marketplaceSellerKey;
  }
  await repo.update(owner.id, { marketplaceSellerKey: owner.id });
  return owner.id;
}

const AgreementSchema = z.object({ version: z.string().min(1).max(32).optional() });

router.post(
  '/me/payments/agreement',
  requireOwnerAuth,
  validateRequest({ body: AgreementSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const { repo, owner } = await loadOwner(req);
        const sellerKey = await ensureSellerKey(repo, owner);
        const version = (req.body as z.infer<typeof AgreementSchema>).version || AGREEMENT_VERSION;

        const result = await getStoreService().acceptAgreement(sellerKey, version);

        res.json({ accepted: true, version: result.version, acceptedAt: result.acceptedAt, sellerKey });
      } catch (error) {
        next(error);
      }
    })();
  },
);

router.post('/me/payments/connect', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const { repo, owner } = await loadOwner(req);
      const sellerKey = await ensureSellerKey(repo, owner);

      const onboardingUrl = await getStoreService().buildOnboardingUrl(sellerKey, paymentsReturnUrl(), {
        email: owner.contactEmail,
        productDescription: productDescriptionFor(owner),
      });

      res.json({ onboardingUrl, sellerKey });
    } catch (error) {
      next(error);
    }
  })();
});

router.get('/me/payments/status', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const { repo, owner } = await loadOwner(req);

      const sellerKey = owner.marketplaceSellerKey || null;
      const relay: MarketplaceSellerStatus | null = sellerKey ? await getStoreService().getSellerStatus(sellerKey) : null;

      let connectedAt: Date | null = owner.paymentsConnectedAt;
      if (relay?.connected && !connectedAt) {
        connectedAt = new Date();
        await repo.update(owner.id, {
          paymentsConnectedAt: connectedAt,
          payoutProviderRef: relay.sellerRef ?? owner.payoutProviderRef,
        });
      } else if (relay && !relay.connected && connectedAt) {
        // The seller can no longer take charges: paid paywalls must stop until it can.
        connectedAt = null;
        await repo.update(owner.id, { paymentsConnectedAt: null });
      }

      res.json({
        sellerKey,
        merchantId: relay?.sellerRef ?? owner.payoutProviderRef ?? null,
        connected: relay?.connected ?? false,
        connectedAt: connectedAt ? connectedAt.toISOString() : null,
        status: relay?.status ?? null,
        chargesEnabled: relay?.chargesEnabled ?? false,
        payoutsEnabled: relay?.payoutsEnabled ?? false,
        // Accepted means accepted at the current version: an older acceptance sends the coach back to step 1.
        agreementAccepted: Boolean(relay?.agreementAccepted) && relay?.agreementVersion === AGREEMENT_VERSION,
        agreementVersion: relay?.agreementVersion ?? null,
        agreementCurrentVersion: AGREEMENT_VERSION,
        agreementAcceptedAt: relay?.agreementAcceptedAt ?? null,
        mode: relay?.mode ?? null,
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersPaymentsRouter(): Router {
  return router;
}
