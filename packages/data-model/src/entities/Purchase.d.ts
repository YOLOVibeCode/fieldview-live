/**
 * Purchase Entity
 *
 * Links to ViewerIdentity (email required) for monitoring queries.
 */
export type PurchaseStatus = 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export interface Purchase {
    id: string;
    gameId: string;
    viewerId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    processorFeeCents: number;
    ownerNetCents: number;
    status: PurchaseStatus;
    paymentProviderPaymentId?: string;
    paymentProviderCustomerId?: string;
    createdAt: Date;
    paidAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
}
//# sourceMappingURL=Purchase.d.ts.map