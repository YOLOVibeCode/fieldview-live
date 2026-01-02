"use strict";
/**
 * Marketplace Fee Calculator
 *
 * Calculates marketplace split for Square payments.
 * Square: 2.9% + $0.30 per transaction.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMarketplaceSplit = calculateMarketplaceSplit;
function calculateMarketplaceSplit(grossAmountCents, platformFeePercent = 10) {
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
//# sourceMappingURL=feeCalculator.js.map