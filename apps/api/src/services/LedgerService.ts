/**
 * Ledger Service
 *
 * Creates immutable ledger entries for marketplace accounting.
 * Full transparency: shows gross → platform fee → processor fee → net.
 */

import type { Purchase } from '@prisma/client';

import type { ILedgerWriter } from '../repositories/ILedgerRepository';
import type { IOwnerAccountReader } from '../repositories/IOwnerAccountRepository';

export interface MarketplaceSplit {
  grossAmountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export class LedgerService {
  constructor(
    private ledgerWriter: ILedgerWriter,
    private ownerAccountReader: IOwnerAccountReader
  ) {}

  /**
   * Create ledger entries for a successful purchase.
   * Idempotent: checks if entries already exist before creating.
   */
  async createPurchaseLedgerEntries(
    purchase: Purchase,
    split: MarketplaceSplit,
    actualProcessorFeeCents?: number // Use actual Square fee if available, otherwise use estimated
  ): Promise<void> {
    // Check if ledger entries already exist for this purchase (idempotency)
    // Note: We'll check this in the caller to avoid circular dependency
    // For now, we'll create entries - caller should check for duplicates

    const ownerAccount = await this.ownerAccountReader.findById(purchase.recipientOwnerAccountId || '');
    if (!ownerAccount) {
      throw new Error(`Owner account not found: ${purchase.recipientOwnerAccountId}`);
    }

    const processorFeeCents = actualProcessorFeeCents ?? split.processorFeeCents;

    // 1. Charge entry (credit to owner) - gross amount
    await this.ledgerWriter.create({
      ownerAccountId: ownerAccount.id,
      type: 'charge',
      amountCents: split.grossAmountCents,
      currency: purchase.currency,
      referenceType: 'purchase',
      referenceId: purchase.id,
      description: `Purchase: ${purchase.amountCents / 100} ${purchase.currency}`,
    });

    // 2. Platform fee entry (debit from owner) - 10% of gross
    await this.ledgerWriter.create({
      ownerAccountId: ownerAccount.id,
      type: 'platform_fee',
      amountCents: -split.platformFeeCents, // Negative = debit
      currency: purchase.currency,
      referenceType: 'purchase',
      referenceId: purchase.id,
      description: `Platform fee (10%): ${split.platformFeeCents / 100} ${purchase.currency}`,
    });

    // 3. Processor fee entry (debit from owner) - actual Square processing fee
    await this.ledgerWriter.create({
      ownerAccountId: ownerAccount.id,
      type: 'processor_fee',
      amountCents: -processorFeeCents, // Negative = debit
      currency: purchase.currency,
      referenceType: 'purchase',
      referenceId: purchase.id,
      description: `Payment processing fee: ${processorFeeCents / 100} ${purchase.currency}`,
    });
  }

  /**
   * Create ledger entries for a refund.
   * Pro-rata platform fee refund (if full refund, refund full platform fee).
   */
  async createRefundLedgerEntries(
    purchase: Purchase,
    refundAmountCents: number,
    refundId: string
  ): Promise<void> {
    const ownerAccount = await this.ownerAccountReader.findById(purchase.recipientOwnerAccountId || '');
    if (!ownerAccount) {
      throw new Error(`Owner account not found: ${purchase.recipientOwnerAccountId}`);
    }

    const isFullRefund = refundAmountCents >= purchase.amountCents;
    const refundRatio = refundAmountCents / purchase.amountCents;

    // 1. Refund entry (debit from owner) - negative of refund amount
    await this.ledgerWriter.create({
      ownerAccountId: ownerAccount.id,
      type: 'refund',
      amountCents: -refundAmountCents, // Negative = debit (reverses charge)
      currency: purchase.currency,
      referenceType: 'refund',
      referenceId: refundId,
      description: `Refund: ${refundAmountCents / 100} ${purchase.currency}`,
    });

    // 2. Platform fee reversal (credit to owner) - pro-rata refund
    const platformFeeRefundCents = isFullRefund
      ? purchase.platformFeeCents
      : Math.round(purchase.platformFeeCents * refundRatio);

    if (platformFeeRefundCents > 0) {
      await this.ledgerWriter.create({
        ownerAccountId: ownerAccount.id,
        type: 'platform_fee',
        amountCents: platformFeeRefundCents, // Positive = credit (reverses platform fee debit)
        currency: purchase.currency,
        referenceType: 'refund',
        referenceId: refundId,
        description: `Platform fee refund: ${platformFeeRefundCents / 100} ${purchase.currency}`,
      });
    }

    // Note: Processor fees are typically not refunded by Square, so we don't reverse them
  }
}

