/**
 * Marks a purchase paid and creates ledger, entitlement, and receipt (idempotent).
 */

import crypto from 'crypto';

import type { Purchase } from '@prisma/client';

import { logger } from '../lib/logger';
import { buildReceiptStreamUrl } from '../lib/receipt-stream-url';
import type { IEntitlementReader, IEntitlementWriter } from '../repositories/IEntitlementRepository';
import type { ILedgerReader } from '../repositories/ILedgerRepository';
import type { IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { LedgerService } from './LedgerService';
import type { ReceiptService } from './ReceiptService';

export interface PurchaseFulfillmentSplit {
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export interface FulfillPaidPurchaseInput {
  purchase: Purchase & { game?: { endsAt?: Date | null } | null };
  paymentId: string;
  split: PurchaseFulfillmentSplit;
  viewerEmail?: string | null;
}

export class PurchaseFulfillmentService {
  constructor(
    private purchaseWriter: IPurchaseWriter,
    private entitlementReader: IEntitlementReader,
    private entitlementWriter: IEntitlementWriter,
    private ledgerService: LedgerService,
    private ledgerReader: ILedgerReader,
    private receiptService: ReceiptService,
  ) {}

  async fulfillPaidPurchase(input: FulfillPaidPurchaseInput): Promise<{ entitlementToken?: string }> {
    const { purchase, paymentId, split, viewerEmail } = input;
    const purchaseId = purchase.id;

    await this.purchaseWriter.update(purchaseId, {
      paymentProviderPaymentId: paymentId,
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'paid',
      paidAt: new Date(),
    });

    try {
      const existing = await this.ledgerReader.findByReference('purchase', purchaseId);
      if (existing.length === 0) {
        await this.ledgerService.createPurchaseLedgerEntries(
          { ...purchase, status: 'paid', paidAt: new Date() },
          {
            grossAmountCents: purchase.amountCents,
            platformFeeCents: split.platformFeeCents,
            processorFeeCents: split.processorFeeCents,
            ownerNetCents: split.ownerNetCents,
          },
          undefined,
        );
      }
    } catch (ledgerError) {
      logger.error({ ledgerError }, 'Failed to create ledger entries (marketplace path)');
    }

    const existingEntitlement = await this.entitlementReader.getByPurchaseId(purchaseId);
    if (existingEntitlement) {
      return { entitlementToken: existingEntitlement.tokenId };
    }

    const now = new Date();
    const game = input.purchase.game;
    const validTo = game?.endsAt ? new Date(game.endsAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tokenId = crypto.randomBytes(32).toString('hex');
    const entitlement = await this.entitlementWriter.create({
      purchaseId,
      tokenId,
      validFrom: now,
      validTo,
      status: 'active',
    });

    if (viewerEmail) {
      const streamUrl = await buildReceiptStreamUrl(purchase, entitlement.tokenId);
      await this.receiptService.sendPurchaseReceipt({
        to: viewerEmail,
        purchaseId,
        amountCents: purchase.amountCents,
        currency: purchase.currency || 'USD',
        streamUrl,
      });
    }

    return { entitlementToken: entitlement.tokenId };
  }
}
