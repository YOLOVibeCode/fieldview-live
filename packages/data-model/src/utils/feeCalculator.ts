/**
 * Marketplace fee split — thin wrapper over shared pricing module.
 */

import { split, type SplitResult } from './pricing';

export interface MarketplaceSplit {
  grossAmountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

function toMarketplaceSplit(
  grossAmountCents: number,
  parts: SplitResult,
): MarketplaceSplit {
  return {
    grossAmountCents,
    platformFeeCents: parts.platformFeeCents,
    processorFeeCents: parts.processingCents,
    ownerNetCents: parts.coachNetCents,
  };
}

/**
 * @param grossAmountCents - Total charged amount in cents
 * @param _deprecatedPlatformFeePercent - ignored; platform fee is fixed at PLATFORM_FEE_BPS
 */
export function calculateMarketplaceSplit(
  grossAmountCents: number,
  _deprecatedPlatformFeePercent?: number,
): MarketplaceSplit {
  return toMarketplaceSplit(grossAmountCents, split({ chargedCents: grossAmountCents }));
}
