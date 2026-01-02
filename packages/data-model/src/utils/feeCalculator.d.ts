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
export declare function calculateMarketplaceSplit(grossAmountCents: number, platformFeePercent?: number): MarketplaceSplit;
//# sourceMappingURL=feeCalculator.d.ts.map