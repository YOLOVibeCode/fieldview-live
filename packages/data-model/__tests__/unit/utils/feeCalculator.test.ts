import { describe, it, expect } from 'vitest';
import { calculateMarketplaceSplit } from '@/utils/feeCalculator';

describe('calculateMarketplaceSplit', () => {
  it('calculates split correctly for $10.00 purchase', () => {
    const result = calculateMarketplaceSplit(1000);

    expect(result.grossAmountCents).toBe(1000);
    expect(result.platformFeeCents).toBe(100);
    expect(result.processorFeeCents).toBe(59);
    expect(result.ownerNetCents).toBe(841);
  });

  it('calculates split correctly for $5.00 purchase', () => {
    const result = calculateMarketplaceSplit(500);

    expect(result.grossAmountCents).toBe(500);
    expect(result.platformFeeCents).toBe(50);
    expect(result.processorFeeCents).toBe(45);
    expect(result.ownerNetCents).toBe(405);
  });

  it('uses fixed 10% platform fee regardless of deprecated second arg', () => {
    const fixed = calculateMarketplaceSplit(1000);
    const withDeprecated = calculateMarketplaceSplit(1000, 20);

    expect(withDeprecated.platformFeeCents).toBe(fixed.platformFeeCents);
    expect(withDeprecated.platformFeeCents).toBe(100);
  });

  it('returns correct types', () => {
    const result = calculateMarketplaceSplit(1000);

    expect(typeof result.grossAmountCents).toBe('number');
    expect(typeof result.platformFeeCents).toBe('number');
    expect(typeof result.processorFeeCents).toBe('number');
    expect(typeof result.ownerNetCents).toBe('number');
  });
});
