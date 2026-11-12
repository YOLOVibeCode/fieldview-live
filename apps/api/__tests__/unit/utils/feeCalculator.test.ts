import { describe, it, expect } from 'vitest';
import { calculateMarketplaceSplit } from '@/utils/feeCalculator';

describe('calculateMarketplaceSplit', () => {
  it('calculates fees correctly for $10.00 (1000 cents)', () => {
    const result = calculateMarketplaceSplit(1000);

    expect(result.grossAmountCents).toBe(1000);
    expect(result.platformFeeCents).toBe(100);
    expect(result.processorFeeCents).toBe(59);
    expect(result.ownerNetCents).toBe(841);
  });

  it('calculates fees correctly for $5.00 (500 cents)', () => {
    const result = calculateMarketplaceSplit(500);

    expect(result.grossAmountCents).toBe(500);
    expect(result.platformFeeCents).toBe(50);
    expect(result.processorFeeCents).toBe(45);
    expect(result.ownerNetCents).toBe(405);
  });

  it('applies fixed 10% platform fee', () => {
    const result = calculateMarketplaceSplit(1000);

    expect(result.platformFeeCents).toBe(100);
    expect(result.ownerNetCents).toBe(841);
  });

  it('handles large amounts correctly', () => {
    const result = calculateMarketplaceSplit(10000);

    expect(result.grossAmountCents).toBe(10000);
    expect(result.platformFeeCents).toBe(1000);
    expect(result.processorFeeCents).toBe(320);
    expect(result.ownerNetCents).toBe(8680);
  });

  it('ensures owner net is never negative', () => {
    const result = calculateMarketplaceSplit(100);

    expect(result.ownerNetCents).toBeGreaterThanOrEqual(0);
  });
});
