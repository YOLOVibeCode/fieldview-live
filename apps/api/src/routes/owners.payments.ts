/**
 * Owner Payments (Relay Connect Hub) Routes.
 *
 * Coach onboarding onto the relay's Square Connect Hub: start Square OAuth via
 * the relay, record Recipient Agreement acceptance, and read connection status.
 * Supersedes the legacy in-repo Square Connect flow (owners.square.ts).
 *
 * See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getRelayConfig } from '../lib/relay';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import type { IRelayConnectOnboarding } from '../services/IRelayConnectHubService';
import { RelayConnectHubService } from '../services/RelayConnectHubService';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:4300';
const AGREEMENT_VERSION = process.env.RELAY_AGREEMENT_VERSION || 'v1';

function postConnectRedirect(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/dashboard?payments_connected=true`;
}

// Lazy init (with test hook), matching the repo convention.
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
 *
 * Returns the relay authorize URL the browser should navigate to in order to
 * connect the coach's Square account. Assigns a stable recipientKey (= owner id).
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

      const authorizeUrl = getRelayService().buildAuthorizeUrl(recipientKey, postConnectRedirect());
      res.json({ authorizeUrl, recipientKey });
    } catch (error) {
      next(error);
    }
  })();
});

const AgreementSchema = z.object({ version: z.string().optional() });

/**
 * POST /api/owners/me/payments/agreement
 *
 * Records the coach's acceptance of the current Recipient Agreement (via relay),
 * and persists the accepted version.
 */
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

/**
 * GET /api/owners/me/payments/status
 *
 * Reports the coach's payment-onboarding state (agreement + Square connection).
 * On first observed connection, stamps paymentsConnectedAt.
 */
router.get('/me/payments/status', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) return next(new UnauthorizedError('Owner account ID not found'));

      const repo = new OwnerAccountRepository(prisma);
      const owner = await repo.findById(req.ownerAccountId);
      if (!owner) return next(new NotFoundError('Owner account not found'));

      const recipientKey = owner.relayRecipientKey || null;
      let connected = false;
      let merchantId: string | null = null;
      if (recipientKey) {
        const status = await getRelayService().getRecipientStatus(recipientKey);
        connected = status.connected;
        merchantId = status.merchantId;
        if (connected && !owner.paymentsConnectedAt) {
          await repo.update(owner.id, { paymentsConnectedAt: new Date() });
        }
      }

      res.json({
        recipientKey,
        merchantId,
        agreementAccepted: Boolean(owner.agreementAcceptedVersion),
        agreementVersion: owner.agreementAcceptedVersion || null,
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
