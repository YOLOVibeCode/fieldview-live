/**
 * Refund Service Interfaces (ISP)
 * 
 * Segregated interfaces for refund operations.
 */

import type { Refund } from '@prisma/client';

export interface AggregatedTelemetry {
  watchMs: number;
  bufferMs: number;
  bufferEvents: number;
  fatalErrors: number;
  streamDownMs: number;
}

export interface RefundEvaluation {
  eligible: boolean;
  reasonCode?: string;
  amountCents?: number;
  ruleVersion: string;
  bufferRatio: number;
  downtimeRatio: number;
  appliedRule?: string;
  telemetrySummary: AggregatedTelemetry;
}

export interface RefundCalculationResult {
  amountCents: number;
  reasonCode: string;
  appliedRule: string;
  ruleVersion: string;
}

/**
 * Reader Interface (ISP)
 */
export interface IRefundReader {
  evaluateRefundEligibility(purchaseId: string): Promise<RefundEvaluation>;
}

/**
 * Writer Interface (ISP)
 */
export interface IRefundWriter {
  issueRefund(
    purchaseId: string,
    reasonCode: string,
    telemetrySummary: AggregatedTelemetry,
    appliedRule: string,
    ruleVersion: string
  ): Promise<Refund>;
  processSquareRefund(refundId: string): Promise<void>;
}
