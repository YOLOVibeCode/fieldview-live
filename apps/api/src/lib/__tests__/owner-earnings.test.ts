import { describe, it, expect } from 'vitest';

import { mapPaidPurchasesToEarnings, sumOwnerEarnings } from '../owner-earnings';

describe('owner-earnings', () => {
  it('maps purchase rows and sums totals', () => {
    const purchases = mapPaidPurchasesToEarnings([
      { id: 'p1', amountCents: 1000, platformFeeCents: 100, processorFeeCents: 59, ownerNetCents: 841 },
      { id: 'p2', amountCents: 500, platformFeeCents: 50, processorFeeCents: 45, ownerNetCents: 405 },
    ]);

    expect(purchases).toEqual([
      { purchaseId: 'p1', grossCents: 1000, platformFeeCents: 100, processorFeeCents: 59, ownerNetCents: 841 },
      { purchaseId: 'p2', grossCents: 500, platformFeeCents: 50, processorFeeCents: 45, ownerNetCents: 405 },
    ]);

    expect(sumOwnerEarnings(purchases)).toEqual({
      grossCents: 1500,
      platformFeeCents: 150,
      processorFeeCents: 104,
      ownerNetCents: 1246,
    });
  });

  it('returns zero totals for empty purchases', () => {
    expect(sumOwnerEarnings([])).toEqual({
      grossCents: 0,
      platformFeeCents: 0,
      processorFeeCents: 0,
      ownerNetCents: 0,
    });
  });
});
