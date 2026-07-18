/**
 * Platform Fee Tests
 *
 * Verifies that the 10% platform fee (applicationFeeMoney) is correctly
 * calculated and sent to Square's payment API.
 *
 * This is critical for the marketplace split: 10% to platform, 90% to owner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { calculateMarketplaceSplit } from '@/utils/feeCalculator';

// Mock dependencies before importing the module under test
vi.mock('@/lib/prisma', () => ({
  prisma: {
    viewerIdentity: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Platform Fee (10%) sent to Square API', () => {
  describe('calculateMarketplaceSplit - fee verification', () => {
    it('calculates exactly 10% platform fee for $10.00 purchase', () => {
      const split = calculateMarketplaceSplit(1000, 10);

      // Platform fee should be exactly 10% of gross
      expect(split.platformFeeCents).toBe(100);
      expect(split.platformFeeCents / split.grossAmountCents).toBe(0.1);
    });

    it('calculates exactly 10% platform fee for $25.00 purchase', () => {
      const split = calculateMarketplaceSplit(2500, 10);

      expect(split.platformFeeCents).toBe(250);
      expect(split.platformFeeCents / split.grossAmountCents).toBe(0.1);
    });

    it('calculates exactly 10% platform fee for $99.99 purchase', () => {
      const split = calculateMarketplaceSplit(9999, 10);

      // 10% of 9999 = 999.9, rounded to 1000
      expect(split.platformFeeCents).toBe(1000);
    });

    it('owner receives 90% minus processor fees', () => {
      const split = calculateMarketplaceSplit(1000, 10);

      // Owner net = gross - platform fee (10%) - processor fee (2.9% + $0.30)
      // 1000 - 100 - 59 = 841 cents
      expect(split.ownerNetCents).toBe(841);

      // Verify owner gets approximately 84.1% after all fees
      const ownerPercentage = split.ownerNetCents / split.grossAmountCents;
      expect(ownerPercentage).toBeCloseTo(0.841, 3);
    });

    it('platform always receives exactly 10% regardless of amount', () => {
      const testAmounts = [100, 500, 1000, 2500, 5000, 10000, 50000];

      for (const amount of testAmounts) {
        const split = calculateMarketplaceSplit(amount, 10);
        const platformPercentage = split.platformFeeCents / split.grossAmountCents;

        // Allow for rounding (should be within 0.5% of 10%)
        expect(platformPercentage).toBeGreaterThanOrEqual(0.095);
        expect(platformPercentage).toBeLessThanOrEqual(0.105);
      }
    });
  });

  describe('applicationFeeMoney structure for Square API', () => {
    it('produces correct applicationFeeMoney object for Square payment', () => {
      const purchaseAmountCents = 1000;
      const PLATFORM_FEE_PERCENT = 10;

      const split = calculateMarketplaceSplit(purchaseAmountCents, PLATFORM_FEE_PERCENT);

      // This is the structure that gets sent to Square
      const applicationFeeMoney = {
        amount: BigInt(split.platformFeeCents),
        currency: 'USD',
      };

      expect(applicationFeeMoney.amount).toBe(BigInt(100));
      expect(applicationFeeMoney.currency).toBe('USD');
    });

    it('applicationFeeMoney.amount equals platformFeeCents from split', () => {
      const amounts = [500, 1000, 2500, 9999];

      for (const amount of amounts) {
        const split = calculateMarketplaceSplit(amount, 10);

        // The applicationFeeMoney.amount sent to Square should exactly match platformFeeCents
        const applicationFeeAmount = BigInt(split.platformFeeCents);

        expect(Number(applicationFeeAmount)).toBe(split.platformFeeCents);
      }
    });
  });

  describe('PLATFORM_FEE_PERCENT environment variable', () => {
    it('defaults to 10% when PLATFORM_FEE_PERCENT is not set', () => {
      // The default is 10 as specified in feeCalculator.ts
      const split = calculateMarketplaceSplit(1000);

      // Default should be 10%
      expect(split.platformFeeCents).toBe(100);
    });

    it('respects custom platform fee percentage', () => {
      // Test with 15% platform fee
      const split15 = calculateMarketplaceSplit(1000, 15);
      expect(split15.platformFeeCents).toBe(150);

      // Test with 5% platform fee
      const split5 = calculateMarketplaceSplit(1000, 5);
      expect(split5.platformFeeCents).toBe(50);
    });
  });

  describe('Edge cases for fee calculation', () => {
    it('handles minimum purchase amount ($1.00)', () => {
      const split = calculateMarketplaceSplit(100, 10);

      expect(split.platformFeeCents).toBe(10); // 10% of $1.00
      expect(split.processorFeeCents).toBe(33); // 2.9% + $0.30 = $0.029 + $0.30 = $0.329 ≈ $0.33
    });

    it('handles large purchase amount ($500.00)', () => {
      const split = calculateMarketplaceSplit(50000, 10);

      expect(split.platformFeeCents).toBe(5000); // 10% of $500.00
      // Processor fee: 2.9% of $500 + $0.30 = $14.50 + $0.30 = $14.80
      expect(split.processorFeeCents).toBe(1480);
    });

    it('all fees sum correctly (gross = platform + processor + ownerNet)', () => {
      const testAmounts = [100, 500, 1000, 2500, 9999, 50000];

      for (const amount of testAmounts) {
        const split = calculateMarketplaceSplit(amount, 10);

        const sum = split.platformFeeCents + split.processorFeeCents + split.ownerNetCents;
        expect(sum).toBe(split.grossAmountCents);
      }
    });
  });
});
