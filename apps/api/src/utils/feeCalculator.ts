/**
 * Marketplace Fee Calculator
 * 
 * Calculates marketplace split (platform fee, processor fee, owner net).
 */

export interface MarketplaceSplit {
  grossAmountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10'); // Default 10%
const PROCESSOR_FEE_PERCENT = 0.029; // Square: 2.9%
const PROCESSOR_FEE_FIXED_CENTS = 30; // Square: $0.30

/**
 * Calculate marketplace split.
 * 
 * @param grossAmountCents - Total amount in cents
 * @param platformFeePercent - Platform fee percentage (default from env or 10%)
 * @returns Marketplace split breakdown
 */
export function calculateMarketplaceSplit(
  grossAmountCents: number,
  platformFeePercent: number = PLATFORM_FEE_PERCENT
): MarketplaceSplit {
  // Square processing fee: 2.9% + $0.30
  const processorFeeCents = Math.round(grossAmountCents * PROCESSOR_FEE_PERCENT + PROCESSOR_FEE_FIXED_CENTS);

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
