/**
 * Marketplace Fee Calculator
 * 
 * Calculates marketplace split for Square payments.
 * Square: 2.9% + $0.30 per transaction.
 */

export interface MarketplaceSplit {
  grossAmountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export function calculateMarketplaceSplit(
  grossAmountCents: number,
  platformFeePercent: number = 10
): MarketplaceSplit {
  // Square: 2.9% + $0.30 per transaction
  const processorFeeCents = Math.round(grossAmountCents * 0.029 + 30);
  
  // Platform fee: percentage of gross
  const platformFeeCents = Math.round(grossAmountCents * (platformFeePercent / 100));
  
  // Owner net: gross - platform fee - processor fee
  const ownerNetCents = grossAmountCents - platformFeeCents - processorFeeCents;
  
  return {
    grossAmountCents,
    platformFeeCents,
    processorFeeCents,
    ownerNetCents,
  };
}
