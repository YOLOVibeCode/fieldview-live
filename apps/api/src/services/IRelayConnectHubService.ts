/**
 * Relay Connect Hub Service Interfaces (ISP).
 *
 * Shapes verified against the relay's authoritative INTEGRATION.md + captured
 * production responses (2026-07-19 canary). See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

export interface RelayFrontendConfig {
  /** Square Web Payments SDK application id (relay-provided). */
  applicationId: string;
  environment: 'production' | 'sandbox';
  // NOTE: locationId does NOT come from the relay — it belongs to the coach's own
  // Square account and is supplied by FieldView (OwnerAccount.squareLocationId).
}

export interface RelayRecipientStatus {
  connected: boolean; // true once merchant_id is present (OAuth completed)
  recipientKey: string;
  merchantId: string | null;
  connectedAt: string | null;
  agreementVersionAccepted: string | null;
}

export interface RelayAgreementResult {
  accepted: boolean;
  version: string;
  acceptedAt: number | null; // unix seconds
}

/**
 * Onboarding Interface (ISP): start Square OAuth via the relay, record Recipient
 * Agreement acceptance, and read connection/frontend config.
 */
export interface IRelayConnectOnboarding {
  /** Pure URL builder — the browser navigates here to begin Square OAuth via the relay. */
  buildAuthorizeUrl(recipientKey: string, postConnectRedirect?: string): string;
  acceptAgreement(recipientKey: string, version: string, ip?: string): Promise<RelayAgreementResult>;
  getFrontendConfig(recipientKey: string): Promise<RelayFrontendConfig>;
  getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus>;
}

/**
 * A one-time charge on the recipient's (coach's) Square merchant via the relay.
 * The relay applies the platform `app_fee_money` from the product's configured
 * `app_fee_bps`; pass `appFeeBps` only to override (subject to the product ceiling).
 */
export interface RelayChargeInput {
  sourceId: string; // Square Web Payments SDK nonce (cnon:...)
  amountCents: number;
  idempotencyKey: string;
  appFeeBps?: number; // optional per-transaction override
  note?: string;
  referenceId?: string; // link to a FieldView record (use purchaseId)
  statementDescriptionIdentifier?: string;
  buyerEmailAddress?: string;
}

/** Parsed from the relay's `{ payment: {...} }` envelope. `raw` carries the full body. */
export interface RelayChargeResult {
  paymentId: string;
  status: string; // COMPLETED | PENDING | APPROVED | FAILED | CANCELED
  amountCents: number;
  appFeeCents: number | null;
  cardBrand: string | null;
  cardLast4: string | null;
  receiptUrl: string | null;
  raw: unknown;
}

export interface RelayRefundInput {
  paymentId: string;
  amountCents: number;
  idempotencyKey: string;
  reason?: string;
}

/** Parsed from the relay's `{ refund: {...} }` envelope. */
export interface RelayRefundResult {
  refundId: string;
  status: string; // PENDING | COMPLETED | REJECTED | FAILED
  amountCents: number;
  raw: unknown;
}

/**
 * Payments Interface (ISP) — charge/refund on a connected recipient.
 */
export interface IRelayConnectPayments {
  charge(recipientKey: string, input: RelayChargeInput): Promise<RelayChargeResult>;
  refund(recipientKey: string, input: RelayRefundInput): Promise<RelayRefundResult>;
}
