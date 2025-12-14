import { describe, it, expect } from 'vitest';
import { calculateMarketplaceSplit, type MarketplaceSplit } from '@/utils/feeCalculator';

describe('calculateMarketplaceSplit', () => {
  it('calculates split correctly for $10.00 purchase', () => {
    const result = calculateMarketplaceSplit(1000, 10); // $10.00, 10% platform fee
    
    expect(result.grossAmountCents).toBe(1000);
    expect(result.platformFeeCents).toBe(100); // 10% of $10.00
    expect(result.processorFeeCents).toBe(59); // 2.9% + $0.30 = $0.29 + $0.30 = $0.59
    expect(result.ownerNetCents).toBe(841); // $10.00 - $1.00 - $0.59 = $8.41
  });
  
  it('calculates split correctly for $5.00 purchase', () => {
    const result = calculateMarketplaceSplit(500, 10);
    
    expect(result.grossAmountCents).toBe(500);
    expect(result.platformFeeCents).toBe(50);
    expect(result.processorFeeCents).toBe(45); // 2.9% of $5.00 + $0.30 = $0.145 + $0.30 = $0.445 ≈ $0.45
    expect(result.ownerNetCents).toBe(405);
  });
  
  it('handles zero platform fee', () => {
    const result = calculateMarketplaceSplit(1000, 0);
    
    expect(result.platformFeeCents).toBe(0);
    expect(result.processorFeeCents).toBe(59);
    expect(result.ownerNetCents).toBe(941);
  });
  
  it('returns correct types', () => {
    const result = calculateMarketplaceSplit(1000, 10);
    
    expect(typeof result.grossAmountCents).toBe('number');
    expect(typeof result.platformFeeCents).toBe('number');
    expect(typeof result.processorFeeCents).toBe('number');
    expect(typeof result.ownerNetCents).toBe('number');
  });
});
