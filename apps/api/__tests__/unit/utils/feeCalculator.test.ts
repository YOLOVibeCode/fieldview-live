import { describe, it, expect } from 'vitest';
import { calculateMarketplaceSplit } from '@/utils/feeCalculator';

describe('calculateMarketplaceSplit', () => {
  it('calculates fees correctly for $10.00 (1000 cents)', () => {
    const result = calculateMarketplaceSplit(1000, 10);

    expect(result.grossAmountCents).toBe(1000);
    expect(result.platformFeeCents).toBe(100); // 10% of 1000
    expect(result.processorFeeCents).toBe(59); // 2.9% of 1000 + 30 = 29 + 30 = 59
    expect(result.ownerNetCents).toBe(841); // 1000 - 100 - 59 = 841
  });

  it('calculates fees correctly for $5.00 (500 cents)', () => {
    const result = calculateMarketplaceSplit(500, 10);

    expect(result.grossAmountCents).toBe(500);
    expect(result.platformFeeCents).toBe(50); // 10% of 500
    expect(result.processorFeeCents).toBe(45); // 2.9% of 500 + 30 = 14.5 + 30 = 45 (rounded)
    expect(result.ownerNetCents).toBe(405); // 500 - 50 - 45 = 405
  });

  it('uses custom platform fee percentage', () => {
    const result = calculateMarketplaceSplit(1000, 20);

    expect(result.platformFeeCents).toBe(200); // 20% of 1000
    expect(result.processorFeeCents).toBe(59); // Same processor fee
    expect(result.ownerNetCents).toBe(741); // 1000 - 200 - 59 = 741
  });

  it('handles large amounts correctly', () => {
    const result = calculateMarketplaceSplit(10000, 10);

    expect(result.grossAmountCents).toBe(10000);
    expect(result.platformFeeCents).toBe(1000); // 10% of 10000
    expect(result.processorFeeCents).toBe(320); // 2.9% of 10000 + 30 = 290 + 30 = 320
    expect(result.ownerNetCents).toBe(8680); // 10000 - 1000 - 320 = 8680
  });

  it('ensures owner net is never negative', () => {
    // Even with very high platform fee, owner should get something
    const result = calculateMarketplaceSplit(100, 50);

    expect(result.ownerNetCents).toBeGreaterThanOrEqual(0);
  });
});
