/**
 * Aggregates per-purchase earnings for owner dashboard / ledger API.
 */

export interface OwnerPurchaseEarnings {
  purchaseId: string;
  grossCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export interface OwnerEarningsTotals {
  grossCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export interface PaidPurchaseRow {
  id: string;
  amountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export function mapPaidPurchasesToEarnings(rows: PaidPurchaseRow[]): OwnerPurchaseEarnings[] {
  return rows.map((row) => ({
    purchaseId: row.id,
    grossCents: row.amountCents,
    platformFeeCents: row.platformFeeCents,
    processorFeeCents: row.processorFeeCents,
    ownerNetCents: row.ownerNetCents,
  }));
}

export function sumOwnerEarnings(purchases: OwnerPurchaseEarnings[]): OwnerEarningsTotals {
  return purchases.reduce(
    (acc, p) => ({
      grossCents: acc.grossCents + p.grossCents,
      platformFeeCents: acc.platformFeeCents + p.platformFeeCents,
      processorFeeCents: acc.processorFeeCents + p.processorFeeCents,
      ownerNetCents: acc.ownerNetCents + p.ownerNetCents,
    }),
    { grossCents: 0, platformFeeCents: 0, processorFeeCents: 0, ownerNetCents: 0 },
  );
}
