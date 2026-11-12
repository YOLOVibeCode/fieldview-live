import { describe, expect, it } from 'vitest';

import {
  InvalidListPriceError,
  MIN_CHARGE_CENTS,
  PLATFORM_FEE_BPS,
  split,
  validateListPrice,
  viewerPrice,
} from '@/utils/pricing';

describe('viewerPrice', () => {
  it('absorb mode returns list price unchanged', () => {
    expect(viewerPrice({ listCents: 700, feeMode: 'absorb' })).toBe(700);
    expect(viewerPrice({ listCents: 100, feeMode: 'absorb' })).toBe(100);
  });

  it('pass_through mode charges $8.39 for $7 list (plan example)', () => {
    expect(viewerPrice({ listCents: 700, feeMode: 'pass_through' })).toBe(839);
  });

  it('pass_through always rounds up to the next cent', () => {
    expect(viewerPrice({ listCents: 100, feeMode: 'pass_through' })).toBeGreaterThanOrEqual(100);
  });
});

describe('split', () => {
  it('splits $8.39 charge per pass-through example', () => {
    const result = split({ chargedCents: 839 });
    expect(result.platformFeeCents).toBe(84);
    expect(result.processingCents).toBe(54);
    expect(result.coachNetCents).toBe(701);
  });

  it('splits $10.00 absorb charge', () => {
    const result = split({ chargedCents: 1000 });
    expect(result.platformFeeCents).toBe(100);
    expect(result.processingCents).toBe(59);
    expect(result.coachNetCents).toBe(841);
  });
});

describe('validateListPrice', () => {
  it('accepts 0 (free)', () => {
    expect(() => validateListPrice(0)).not.toThrow();
  });

  it('accepts minimum paid price 100', () => {
    expect(() => validateListPrice(100)).not.toThrow();
  });

  it('rejects 99¢', () => {
    expect(() => validateListPrice(99)).toThrow(InvalidListPriceError);
  });

  it('rejects amounts between 1 and 99', () => {
    expect(() => validateListPrice(50)).toThrow(InvalidListPriceError);
  });
});

describe('constants', () => {
  it('platform fee is 10%', () => {
    expect(PLATFORM_FEE_BPS).toBe(1000);
  });

  it('minimum charge is $1', () => {
    expect(MIN_CHARGE_CENTS).toBe(100);
  });
});
