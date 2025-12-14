/**
 * Refund Calculator
 * 
 * Deterministic refund calculation based on refund rules.
 * Per refund-and-quality-rules.md specification.
 */

import type { AggregatedTelemetry, RefundCalculationResult } from '../services/IRefundService';

export interface RefundRuleConfig {
  fullRefundBufferRatio: number; // Default: 0.20 (20%)
  halfRefundBufferRatio: number; // Default: 0.10 (10%)
  excessiveBufferingEvents: number; // Default: 10
  partialRefundPercent: number; // Default: 25%
  minWatchTimeForRefund: number; // Default: 30000ms (30 seconds)
  ruleVersion: string; // Default: 'v1.0'
}

export const DEFAULT_REFUND_RULES: RefundRuleConfig = {
  fullRefundBufferRatio: 0.20,
  halfRefundBufferRatio: 0.10,
  excessiveBufferingEvents: 10,
  partialRefundPercent: 25,
  minWatchTimeForRefund: 30000, // 30 seconds
  ruleVersion: 'v1.0',
};

export interface RefundCalculationInput {
  purchaseAmountCents: number;
  telemetry: AggregatedTelemetry;
  expectedGameDurationMs: number; // Game duration in milliseconds
  config?: Partial<RefundRuleConfig>;
}

/**
 * Calculate refund eligibility and amount
 * 
 * Returns the most generous refund that applies (no stacking).
 */
export function calculateRefund(input: RefundCalculationInput): RefundCalculationResult | null {
  const config = { ...DEFAULT_REFUND_RULES, ...input.config };
  const { purchaseAmountCents, telemetry, expectedGameDurationMs } = input;

  // Avoid fraud: if watch time is too low, don't refund
  if (telemetry.watchMs < config.minWatchTimeForRefund) {
    return null;
  }

  // Calculate derived metrics
  const bufferRatio = telemetry.watchMs > 0 ? telemetry.bufferMs / telemetry.watchMs : 0;
  const downtimeRatio =
    expectedGameDurationMs > 0 ? telemetry.streamDownMs / expectedGameDurationMs : 0;

  // Check for full refund conditions (highest priority)
  if (
    bufferRatio > config.fullRefundBufferRatio ||
    downtimeRatio > config.fullRefundBufferRatio ||
    (telemetry.fatalErrors >= 3 && telemetry.watchMs < 5 * 60 * 1000) // < 5 minutes
  ) {
    let appliedRule = '';
    if (bufferRatio > config.fullRefundBufferRatio) {
      appliedRule = 'full_refund_buffer_ratio_high';
    } else if (downtimeRatio > config.fullRefundBufferRatio) {
      appliedRule = 'full_refund_downtime_ratio_high';
    } else {
      appliedRule = 'full_refund_fatal_errors_multiple';
    }

    return {
      amountCents: purchaseAmountCents,
      reasonCode: appliedRule,
      appliedRule,
      ruleVersion: config.ruleVersion,
    };
  }

  // Check for half refund conditions
  if (
    (bufferRatio > config.halfRefundBufferRatio && bufferRatio <= config.fullRefundBufferRatio) ||
    (downtimeRatio > config.halfRefundBufferRatio &&
      downtimeRatio <= config.fullRefundBufferRatio) ||
    (telemetry.fatalErrors >= 1 && telemetry.watchMs < 2 * 60 * 1000) // < 2 minutes
  ) {
    let appliedRule = '';
    if (bufferRatio > config.halfRefundBufferRatio) {
      appliedRule = 'half_refund_buffer_ratio_medium';
    } else if (downtimeRatio > config.halfRefundBufferRatio) {
      appliedRule = 'half_refund_downtime_ratio_medium';
    } else {
      appliedRule = 'half_refund_fatal_error_minimal_watch';
    }

    return {
      amountCents: Math.floor(purchaseAmountCents * 0.5),
      reasonCode: appliedRule,
      appliedRule,
      ruleVersion: config.ruleVersion,
    };
  }

  // Check for partial refund (excessive buffering interruptions)
  // Note: This doesn't stack with half refund - we already checked half refund above
  if (telemetry.bufferEvents > config.excessiveBufferingEvents) {
    return {
      amountCents: Math.floor((purchaseAmountCents * config.partialRefundPercent) / 100),
      reasonCode: 'partial_refund_excessive_buffering',
      appliedRule: 'partial_refund_excessive_buffering',
      ruleVersion: config.ruleVersion,
    };
  }

  // No refund eligible
  return null;
}
