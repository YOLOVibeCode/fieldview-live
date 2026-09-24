/**
 * Owner Payments (Relay Connect Hub) Routes — Stripe Connect via Noctusoft relay.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getRelayConfig, isPaymentsViaRelay } from '../lib/relay';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import type { IRelayConnectOnboarding } from '../services/IRelayConnectHubService';
import { RelayConnectHubService } from '../services/RelayConnectHubService';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:4300';
const AGREEMENT_VERSION = process.env.RELAY_AGREEMENT_VERSION || 'v1';

function postConnectReturnUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/dashboard?payments_connected=true`;
}

function postConnectRefreshUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/payments?refresh=true`;
}

let relayServiceInstance: IRelayConnectOnboarding | null = null;

function getRelayService(): IRelayConnectOnboarding {
  if (!relayServiceInstance) {
    relayServiceInstance = new RelayConnectHubService(getRelayConfig());
  }
  return relayServiceInstance;
}

export function setRelayService(service: IRelayConnectOnboarding): void {
  relayServiceInstance = service;
}

/**
 * POST /api/owners/me/payments/connect
 */
router.post('/me/payments/connect', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

      const repo = new OwnerAccountRepository(prisma);
      const owner = await repo.findById(req.ownerAccountId);
      if (!owner) return next(new NotFoundError('Owner account not found'));

      const recipientKey = owner.relayRecipientKey || owner.id;
      if (!owner.relayRecipientKey) {
        await repo.update(owner.id, { relayRecipientKey: recipientKey });
      }

      const result = await getRelayService().onboard(recipientKey, {
        email: owner.contactEmail ?? undefined,
        refreshUrl: postConnectRefreshUrl(),
        returnUrl: postConnectReturnUrl(),
      });

      res.json({ url: result.url, recipientKey, stripeAccountId: result.stripeAccountId });
    } catch (error) {
      next(error);
    }
  })();
});

const AgreementSchema = z.object({ version: z.string().optional() });

router.post(
  '/me/payments/agreement',
  requireOwnerAuth,
  validateRequest({ body: AgreementSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

        const repo = new OwnerAccountRepository(prisma);
        const owner = await repo.findById(req.ownerAccountId);
        if (!owner) return next(new NotFoundError('Owner account not found'));

        const recipientKey = owner.relayRecipientKey || owner.id;
        const version = (req.body as { version?: string }).version || AGREEMENT_VERSION;
        const result = await getRelayService().acceptAgreement(recipientKey, version, req.ip);

        await repo.update(owner.id, {
          relayRecipientKey: recipientKey,
          agreementAcceptedVersion: result.version,
        });

        res.json({ accepted: result.accepted, version: result.version });
      } catch (error) {
        next(error);
      }
    })();
  },
);

router.get('/me/payments/status', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

      const repo = new OwnerAccountRepository(prisma);
      const owner = await repo.findById(req.ownerAccountId);
      if (!owner) return next(new NotFoundError('Owner account not found'));

      const recipientKey = owner.relayRecipientKey || null;
      let connected = false;
      let stripeAccountId: string | null = null;
      if (recipientKey) {
        const status = await getRelayService().getRecipientStatus(recipientKey);
        connected = status.connected;
        stripeAccountId = status.stripeAccountId;
        if (connected && !owner.paymentsConnectedAt) {
          await repo.update(owner.id, { paymentsConnectedAt: new Date() });
        }
      }

      res.json({
        recipientKey,
        stripeAccountId,
        merchantId: null,
        agreementAccepted: Boolean(owner.agreementAcceptedVersion),
        agreementVersion: owner.agreementAcceptedVersion || null,
        connected,
        connectedAt: owner.paymentsConnectedAt ? owner.paymentsConnectedAt.toISOString() : null,
        locationId: owner.squareLocationId || null,
        requiresLocationId: !isPaymentsViaRelay(),
      });
    } catch (error) {
      next(error);
    }
  })();
});

const LocationSchema = z.object({ locationId: z.string().min(1) });

router.post(
  '/me/payments/location',
  requireOwnerAuth,
  validateRequest({ body: LocationSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

        if (isPaymentsViaRelay()) {
          throw new BadRequestError('Location ID is not required for Stripe Connect via the relay.');
        }

        const repo = new OwnerAccountRepository(prisma);
        const owner = await repo.findById(req.ownerAccountId);
        if (!owner) return next(new NotFoundError('Owner account not found'));

        const locationId = (req.body as { locationId: string }).locationId.trim();
        await repo.update(owner.id, { squareLocationId: locationId });

        res.json({ locationId });
      } catch (error) {
        next(error);
      }
    })();
  },
);

export function createOwnersPaymentsRouter(): Router {
  return router;
}
