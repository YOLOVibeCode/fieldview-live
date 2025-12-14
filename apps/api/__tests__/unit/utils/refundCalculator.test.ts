import { describe, it, expect } from 'vitest';
import { calculateRefund, DEFAULT_REFUND_RULES } from '@/utils/refundCalculator';
import type { AggregatedTelemetry } from '@/services/IRefundService';

describe('Refund Calculator', () => {
  const defaultGameDurationMs = 90 * 60 * 1000; // 90 minutes

  describe('Full refund conditions', () => {
    it('returns full refund for buffer ratio > 20%', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000, // 1 minute
        bufferMs: 15000, // 15 seconds (25% buffer ratio)
        bufferEvents: 5,
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(1000);
      expect(result?.reasonCode).toBe('full_refund_buffer_ratio_high');
      expect(result?.appliedRule).toBe('full_refund_buffer_ratio_high');
    });

    it('returns full refund for downtime ratio > 20%', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 0,
        bufferEvents: 0,
        fatalErrors: 0,
        streamDownMs: defaultGameDurationMs * 0.25, // 25% downtime
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(1000);
      expect(result?.reasonCode).toBe('full_refund_downtime_ratio_high');
    });

    it('returns full refund for 3+ fatal errors with minimal watch time', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 4 * 60 * 1000, // 4 minutes (< 5 minutes)
        bufferMs: 0,
        bufferEvents: 0,
        fatalErrors: 3,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(1000);
      expect(result?.reasonCode).toBe('full_refund_fatal_errors_multiple');
    });
  });

  describe('Half refund conditions', () => {
    it('returns half refund for buffer ratio 10-20%', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 9000, // 15% buffer ratio
        bufferEvents: 3,
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(500);
      expect(result?.reasonCode).toBe('half_refund_buffer_ratio_medium');
    });

    it('returns half refund for downtime ratio 10-20%', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 0,
        bufferEvents: 0,
        fatalErrors: 0,
        streamDownMs: defaultGameDurationMs * 0.15, // 15% downtime
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(500);
      expect(result?.reasonCode).toBe('half_refund_downtime_ratio_medium');
    });

    it('returns half refund for fatal error with minimal watch time', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 90 * 1000, // 1.5 minutes (< 2 minutes)
        bufferMs: 0,
        bufferEvents: 0,
        fatalErrors: 1,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(500);
      expect(result?.reasonCode).toBe('half_refund_fatal_error_minimal_watch');
    });
  });

  describe('Partial refund conditions', () => {
    it('returns partial refund for excessive buffering interruptions', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 5000, // 8.3% buffer ratio (< 10%)
        bufferEvents: 15, // > 10 interruptions
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(250); // 25% of 1000
      expect(result?.reasonCode).toBe('partial_refund_excessive_buffering');
    });
  });

  describe('No refund conditions', () => {
    it('returns null for good quality stream', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 3000, // 5% buffer ratio
        bufferEvents: 3,
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).toBeNull();
    });

    it('returns null for watch time < 30 seconds (fraud prevention)', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 20000, // 20 seconds
        bufferMs: 15000, // 75% buffer ratio (would normally trigger refund)
        bufferEvents: 20,
        fatalErrors: 5,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      expect(result).toBeNull();
    });
  });

  describe('Refund priority (most generous)', () => {
    it('applies full refund when multiple conditions met', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 15000, // 25% buffer ratio (full refund)
        bufferEvents: 15, // Excessive interruptions (partial refund)
        fatalErrors: 1, // Fatal error (half refund)
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      // Should apply full refund (most generous)
      expect(result?.amountCents).toBe(1000);
      expect(result?.reasonCode).toBe('full_refund_buffer_ratio_high');
    });

    it('applies half refund over partial refund', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 9000, // 15% buffer ratio (half refund)
        bufferEvents: 15, // Excessive interruptions (partial refund)
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
      });

      // Should apply half refund (more generous than partial)
      expect(result?.amountCents).toBe(500);
      expect(result?.reasonCode).toBe('half_refund_buffer_ratio_medium');
    });
  });

  describe('Custom configuration', () => {
    it('respects custom refund thresholds', () => {
      const telemetry: AggregatedTelemetry = {
        watchMs: 60000,
        bufferMs: 12000, // 20% buffer ratio
        bufferEvents: 5,
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = calculateRefund({
        purchaseAmountCents: 1000,
        telemetry,
        expectedGameDurationMs: defaultGameDurationMs,
        config: {
          fullRefundBufferRatio: 0.25, // Custom: 25% threshold
          halfRefundBufferRatio: 0.15, // Custom: 15% threshold
        },
      });

      // With custom thresholds, 20% should trigger half refund, not full
      expect(result?.amountCents).toBe(500);
      expect(result?.reasonCode).toBe('half_refund_buffer_ratio_medium');
    });
  });
});
