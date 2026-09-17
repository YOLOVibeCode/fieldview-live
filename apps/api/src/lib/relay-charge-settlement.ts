/**
 * Resolves marketplace split for a relay Connect Hub charge.
 * Uses relay-reported app fee when present; otherwise estimates via calculateMarketplaceSplit.
 */

import { calculateMarketplaceSplit, type MarketplaceSplit } from '../utils/feeCalculator';

export interface RelayChargeSettlementInput {
  amountCents: number;
  processorFeeCents: number;
  appFeeCents: number | null;
  platformFeePercent?: number;
}

export function resolveRelayChargeSettlement(input: RelayChargeSettlementInput): MarketplaceSplit {
  const platformFeePercent = input.platformFeePercent ?? parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
  const estimate = calculateMarketplaceSplit(input.amountCents, platformFeePercent);
  const platformFeeCents = input.appFeeCents ?? estimate.platformFeeCents;
  const processorFeeCents = input.processorFeeCents;
  const ownerNetCents = input.amountCents - platformFeeCents - processorFeeCents;

  return {
    grossAmountCents: input.amountCents,
    platformFeeCents,
    processorFeeCents,
    ownerNetCents,
  };
}
