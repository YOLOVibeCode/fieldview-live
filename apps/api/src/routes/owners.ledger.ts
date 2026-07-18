/**
 * Owner Ledger Routes
 *
 * Transparency endpoints for owners to view their financial breakdown.
 * Shows gross → platform fee → processor fee → net with full visibility.
 */

import express, { type Router } from 'express';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';

const router = express.Router();

// Lazy initialization
let ledgerRepoInstance: LedgerRepository | null = null;
let ownerAccountRepoInstance: OwnerAccountRepository | null = null;

function getLedgerRepo(): LedgerRepository {
  if (!ledgerRepoInstance) {
    ledgerRepoInstance = new LedgerRepository(prisma);
  }
  return ledgerRepoInstance;
}

function getOwnerAccountRepo(): OwnerAccountRepository {
  if (!ownerAccountRepoInstance) {
    ownerAccountRepoInstance = new OwnerAccountRepository(prisma);
  }
  return ownerAccountRepoInstance;
}

/**
 * GET /api/owners/me/ledger
 *
 * Get ledger entries for the authenticated owner.
 * Full transparency: shows all charges, fees, refunds.
 */
router.get('/me/ledger', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Owner account not found' } });
      }

      const ledgerRepo = getLedgerRepo();
      const entries = await ledgerRepo.findByOwnerAccountId(req.ownerAccountId);

      res.json({
        entries: entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          amountCents: entry.amountCents,
          currency: entry.currency,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          description: entry.description,
          createdAt: entry.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/owners/me/balance
 *
 * Get current balance for the authenticated owner.
 * Sum of all ledger entries (positive = credits, negative = debits).
 */
router.get('/me/balance', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Owner account not found' } });
      }

      const ledgerRepo = getLedgerRepo();
      const balanceCents = await ledgerRepo.getBalance(req.ownerAccountId);

      const ownerAccount = await getOwnerAccountRepo().findById(req.ownerAccountId);
      const currency = 'USD'; // Default, could be made configurable per account

      res.json({
        balanceCents,
        balance: balanceCents / 100,
        currency,
        // Payout status: In marketplace Model A, Square pays out automatically
        payoutStatus: ownerAccount?.payoutProviderRef
          ? 'connected' // Square connected, payouts handled by Square
          : 'not_connected', // Need to connect Square
        payoutNote: ownerAccount?.payoutProviderRef
          ? 'Payouts are handled automatically by Square. Funds are deposited to your connected bank account per Square\'s payout schedule.'
          : 'Connect your Square account to receive payouts.',
      });
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/owners/me/transparency
 *
 * Get financial transparency breakdown for the authenticated owner.
 * Shows gross revenue, platform fees, processor fees, net earnings.
 */
router.get('/me/transparency', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      if (!req.ownerAccountId) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Owner account not found' } });
      }

      const ledgerRepo = getLedgerRepo();
      const entries = await ledgerRepo.findByOwnerAccountId(req.ownerAccountId);

      // Calculate totals by type
      let totalChargesCents = 0;
      let totalPlatformFeesCents = 0;
      let totalProcessorFeesCents = 0;
      let totalRefundsCents = 0;

      for (const entry of entries) {
        switch (entry.type) {
          case 'charge':
            totalChargesCents += entry.amountCents;
            break;
          case 'platform_fee':
            // Platform fees are negative (debits), so we sum the absolute value
            totalPlatformFeesCents += Math.abs(entry.amountCents);
            break;
          case 'processor_fee':
            // Processor fees are negative (debits), so we sum the absolute value
            totalProcessorFeesCents += Math.abs(entry.amountCents);
            break;
          case 'refund':
            totalRefundsCents += Math.abs(entry.amountCents);
            break;
        }
      }

      const grossRevenueCents = totalChargesCents;
      const netEarningsCents = grossRevenueCents - totalPlatformFeesCents - totalProcessorFeesCents - totalRefundsCents;

      res.json({
        grossRevenueCents,
        grossRevenue: grossRevenueCents / 100,
        platformFeesCents: totalPlatformFeesCents,
        platformFees: totalPlatformFeesCents / 100,
        platformFeePercent: grossRevenueCents > 0 ? (totalPlatformFeesCents / grossRevenueCents) * 100 : 0,
        processorFeesCents: totalProcessorFeesCents,
        processorFees: totalProcessorFeesCents / 100,
        refundsCents: totalRefundsCents,
        refunds: totalRefundsCents / 100,
        netEarningsCents,
        netEarnings: netEarningsCents / 100,
        currency: 'USD',
        // Transparency message
        message: 'Full transparency: Platform fee (10%) supports FieldView operations. Processor fees are charged by Square. Owner bears processor fees per marketplace Model A.',
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersLedgerRouter(): Router {
  return router;
}

