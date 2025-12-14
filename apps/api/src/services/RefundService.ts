/**
 * Refund Service Implementation
 * 
 * Implements IRefundReader and IRefundWriter.
 * Handles refund evaluation and processing.
 */

import { BadRequestError, NotFoundError } from '../lib/errors';
import { squareClient } from '../lib/square';
import type { IPlaybackSessionReader } from '../repositories/IPlaybackSessionRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { IRefundReader as IRefundRepoReader, IRefundWriter as IRefundRepoWriter } from '../repositories/IRefundRepository';
import { calculateRefund, type RefundCalculationInput } from '../utils/refundCalculator';

import type { IEntitlementReader } from './IEntitlementService';
import type { IRefundReader, IRefundWriter, AggregatedTelemetry, RefundEvaluation } from './IRefundService';
import type { ISmsWriter } from './ISmsService';

const DEFAULT_GAME_DURATION_MS = 90 * 60 * 1000; // 90 minutes

export class RefundService implements IRefundReader, IRefundWriter {
  constructor(
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
    private playbackSessionReader: IPlaybackSessionReader,
    private refundReader: IRefundRepoReader,
    private refundWriter: IRefundRepoWriter,
    private entitlementReader: IEntitlementReader,
    private smsWriter: ISmsWriter
  ) {}

  async evaluateRefundEligibility(purchaseId: string): Promise<RefundEvaluation> {
    // Get purchase
    const purchase = await this.purchaseReader.getById(purchaseId);
    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    // Check if already refunded
    const existingRefunds = await this.refundReader.getByPurchaseId(purchaseId);
    if (existingRefunds.length > 0) {
      // Already refunded
      return {
        eligible: false,
        ruleVersion: 'v1.0',
        bufferRatio: 0,
        downtimeRatio: 0,
        telemetrySummary: {
          watchMs: 0,
          bufferMs: 0,
          bufferEvents: 0,
          fatalErrors: 0,
          streamDownMs: 0,
        },
      };
    }

    // Aggregate telemetry from all playback sessions for this purchase
    const telemetry = await this.aggregateTelemetryForPurchase(purchaseId);

    // Get game to determine expected duration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const purchaseWithRelations = purchase as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const game = purchaseWithRelations.game;
    const expectedGameDurationMs = game?.endsAt && game?.startsAt
      ? new Date(game.endsAt).getTime() - new Date(game.startsAt).getTime()
      : DEFAULT_GAME_DURATION_MS;

    // Calculate refund
    const calculationInput: RefundCalculationInput = {
      purchaseAmountCents: purchase.amountCents,
      telemetry,
      expectedGameDurationMs,
    };

    const refundResult = calculateRefund(calculationInput);

    if (!refundResult) {
      return {
        eligible: false,
        ruleVersion: 'v1.0',
        bufferRatio: telemetry.watchMs > 0 ? telemetry.bufferMs / telemetry.watchMs : 0,
        downtimeRatio:
          expectedGameDurationMs > 0 ? telemetry.streamDownMs / expectedGameDurationMs : 0,
        telemetrySummary: telemetry,
      };
    }

    return {
      eligible: true,
      reasonCode: refundResult.reasonCode,
      amountCents: refundResult.amountCents,
      ruleVersion: refundResult.ruleVersion,
      bufferRatio: telemetry.watchMs > 0 ? telemetry.bufferMs / telemetry.watchMs : 0,
      downtimeRatio:
        expectedGameDurationMs > 0 ? telemetry.streamDownMs / expectedGameDurationMs : 0,
      appliedRule: refundResult.appliedRule,
      telemetrySummary: telemetry,
    };
  }

  async issueRefund(
    purchaseId: string,
    _reasonCode: string,
    telemetrySummary: AggregatedTelemetry,
    _appliedRule: string,
    _ruleVersion: string
  ): Promise<import('@prisma/client').Refund> {
    // Get purchase
    const purchase = await this.purchaseReader.getById(purchaseId);
    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    // Check if already refunded
    const existingRefunds = await this.refundReader.getByPurchaseId(purchaseId);
    if (existingRefunds.length > 0) {
      throw new BadRequestError('Purchase already refunded');
    }

    // Re-evaluate to get refund amount
    const evaluation = await this.evaluateRefundEligibility(purchaseId);
    if (!evaluation.eligible || !evaluation.amountCents) {
      throw new BadRequestError('Purchase not eligible for refund');
    }

    // Create refund record
    const refund = await this.refundWriter.create({
      purchaseId,
      amountCents: evaluation.amountCents,
      reasonCode: evaluation.reasonCode || _reasonCode,
      issuedBy: 'auto',
      ruleVersion: evaluation.ruleVersion,
      telemetrySummary: {
        watchMs: telemetrySummary.watchMs,
        bufferMs: telemetrySummary.bufferMs,
        bufferEvents: telemetrySummary.bufferEvents,
        fatalErrors: telemetrySummary.fatalErrors,
        streamDownMs: telemetrySummary.streamDownMs,
        bufferRatio: evaluation.bufferRatio,
        downtimeRatio: evaluation.downtimeRatio,
        appliedRule: evaluation.appliedRule || _appliedRule,
      },
    });

    // Update purchase status
    const refundAmount = evaluation.amountCents;
    const isFullRefund = refundAmount >= purchase.amountCents;
    await this.purchaseWriter.update(purchaseId, {
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAt: new Date(),
    });

    // Process Square refund
    await this.processSquareRefund(refund.id);

    // Send SMS notification
    // Note: Purchase includes game and viewer relations from repository
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const purchaseWithRelations = purchase as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const viewer = purchaseWithRelations.viewer;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const game = purchaseWithRelations.game;
    
    if (viewer?.phoneE164) {
      const gameTitle = game?.title || 'the game';
      const refundAmountDollars = (refundAmount / 100).toFixed(2);
      const message = `FieldView.Live: We've issued a refund of $${refundAmountDollars} for ${gameTitle} due to stream quality issues. Processing: 5-7 business days. Questions? Reply HELP.`;

      await this.smsWriter.sendNotification(viewer.phoneE164, message);
    }

    return refund;
  }

  async processSquareRefund(refundId: string): Promise<void> {
    // Get refund
    const refund = await this.refundReader.getById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund not found');
    }

    if (refund.processedAt) {
      return; // Already processed
    }

    const refundWithRelations = refund as any;
    const purchase = refundWithRelations.purchase;
    if (!purchase?.paymentProviderPaymentId) {
      throw new BadRequestError('Purchase has no payment provider ID');
    }

    // Create Square refund
    try {
      // Square SDK v43+ - refunds API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const refundsApi = (squareClient as any).refundsApi || (squareClient as any).refunds;
      if (!refundsApi) {
        throw new Error('Square refunds API not available');
      }

      await refundsApi.refundPayment({
        idempotencyKey: `refund-${refundId}-${Date.now()}`,
        amountMoney: {
          amount: BigInt(refund.amountCents),
          currency: purchase.currency || 'USD',
        },
        paymentId: purchase.paymentProviderPaymentId,
        reason: refund.reasonCode,
      });

      // Update refund with processed timestamp
      await this.refundWriter.update(refundId, {
        processedAt: new Date(),
      });
    } catch (error) {
      // Log error but don't throw - refund record is created, processing can be retried
      console.error('Square refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Aggregate telemetry from all playback sessions for a purchase
   */
  private async aggregateTelemetryForPurchase(purchaseId: string): Promise<AggregatedTelemetry> {
    // Get entitlement for this purchase (one-to-one relationship)
    // Note: Using getByPurchaseId which returns a single entitlement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const entitlement = await (this.entitlementReader as any).getByPurchaseId(purchaseId);
    if (!entitlement) {
      return {
        watchMs: 0,
        bufferMs: 0,
        bufferEvents: 0,
        fatalErrors: 0,
        streamDownMs: 0,
      };
    }

    // Get all playback sessions for this entitlement
    const sessions = await this.playbackSessionReader.listByEntitlementId(entitlement.id);

    // Aggregate telemetry from all sessions
    let totalWatchMs = 0;
    let totalBufferMs = 0;
    let totalBufferEvents = 0;
    let totalFatalErrors = 0;
    const totalStreamDownMs = 0;

    for (const session of sessions) {
      totalWatchMs += session.totalWatchMs;
      totalBufferMs += session.totalBufferMs;
      totalBufferEvents += session.bufferEvents;
      totalFatalErrors += session.fatalErrors;
      // Note: streamDownMs is not stored in PlaybackSession yet
      // This would need to be added or calculated from error events
    }

    return {
      watchMs: totalWatchMs,
      bufferMs: totalBufferMs,
      bufferEvents: totalBufferEvents,
      fatalErrors: totalFatalErrors,
      streamDownMs: totalStreamDownMs,
    };
  }
}
