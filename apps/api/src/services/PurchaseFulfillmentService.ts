/**
 * Idempotent purchase fulfillment after a confirmed marketplace payment.
 */

import crypto from 'crypto';

import type { Purchase } from '@prisma/client';

import { getEmailProvider } from '../lib/email';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { buildReceiptStreamUrl } from '../lib/receipt-stream-url';
import { resolveRelayChargeSettlement } from '../lib/relay-charge-settlement';
import type { IEntitlementReader, IEntitlementWriter } from '../repositories/IEntitlementRepository';
import type { IGameReader } from '../repositories/IGameRepository';
import type { ILedgerReader, ILedgerWriter } from '../repositories/ILedgerRepository';
import type { IOwnerAccountReader } from '../repositories/IOwnerAccountRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import { LedgerService } from './LedgerService';
import { ReceiptService } from './ReceiptService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

export interface FulfillPurchaseInput {
  purchaseId: string;
  paymentProviderPaymentId: string;
  appFeeCents?: number | null;
  processorFeeCents?: number;
}

export class PurchaseFulfillmentService {
  private ledgerService: LedgerService;
  private receiptService: ReceiptService;
  private ledgerReader: ILedgerReader;

  constructor(
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
    private entitlementReader: IEntitlementReader,
    private entitlementWriter: IEntitlementWriter,
    private gameReader: IGameReader,
    ledgerRepo: ILedgerReader & ILedgerWriter,
    ownerAccountReader: IOwnerAccountReader,
  ) {
    this.ledgerReader = ledgerRepo;
    this.ledgerService = new LedgerService(ledgerRepo, ownerAccountReader);
    this.receiptService = new ReceiptService(getEmailProvider(), APP_URL);
  }

  async fulfillPaidPurchase(input: FulfillPurchaseInput): Promise<{ entitlementToken: string | null }> {
    const purchase = await this.purchaseReader.getById(input.purchaseId);
    if (!purchase) {
      return { entitlementToken: null };
    }

    if (purchase.status === 'paid') {
      const existing = await this.entitlementReader.getByPurchaseId(purchase.id);
      return { entitlementToken: existing?.tokenId ?? null };
    }

    const split = resolveRelayChargeSettlement({
      amountCents: purchase.amountCents,
      processorFeeCents: input.processorFeeCents ?? purchase.processorFeeCents,
      appFeeCents: input.appFeeCents ?? null,
    });

    const updatedPurchase = await this.purchaseWriter.update(purchase.id, {
      status: 'paid',
      paidAt: new Date(),
      paymentProviderPaymentId: input.paymentProviderPaymentId,
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
    });

    try {
      const existingEntries = await this.ledgerReader.findByReference('purchase', purchase.id);
      if (existingEntries.length === 0) {
        await this.ledgerService.createPurchaseLedgerEntries(updatedPurchase, split, undefined);
      }
    } catch (ledgerError) {
      logger.error({ ledgerError, purchaseId: purchase.id }, 'Failed to create ledger entries');
    }

    let entitlementToken: string | null = null;
    const existingEntitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
    if (existingEntitlement) {
      entitlementToken = existingEntitlement.tokenId;
    } else {
      const now = new Date();
      const game = purchase.gameId ? await this.gameReader.getById(purchase.gameId) : null;
      const validTo = game?.endsAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000);
      entitlementToken = crypto.randomBytes(32).toString('hex');
      await this.entitlementWriter.create({
        purchaseId: purchase.id,
        tokenId: entitlementToken,
        validFrom: now,
        validTo,
        status: 'active',
      });
    }

    const viewer = await prisma.viewerIdentity.findUnique({
      where: { id: purchase.viewerId },
      select: { email: true },
    });
    if (viewer?.email && entitlementToken) {
      const streamUrl = await buildReceiptStreamUrl(purchase as Purchase, entitlementToken);
      await this.receiptService.sendPurchaseReceipt({
        to: viewer.email,
        purchaseId: purchase.id,
        amountCents: purchase.amountCents,
        currency: purchase.currency || 'USD',
        streamUrl,
      });
    }

    return { entitlementToken };
  }
}
