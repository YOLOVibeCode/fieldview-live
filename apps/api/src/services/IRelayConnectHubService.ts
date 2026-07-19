/**
 * Relay Connect Hub Service Interfaces (ISP).
 *
 * Segregated interfaces for onboarding a coach (recipient) onto the relay's
 * Square Connect Hub. Payment operations (charge/refund) land in a separate
 * interface in Slice 2, once response shapes are verified against the live relay.
 *
 * See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

export interface RelayFrontendConfig {
  /** Square Web Payments SDK application id for this recipient's seller context. */
  applicationId: string;
  environment: 'production' | 'sandbox';
  /** Recipient (coach) Square location id, when the relay returns it. */
  locationId?: string;
}

export interface RelayRecipientStatus {
  connected: boolean;
  recipientKey: string;
  merchantId?: string | null;
}

/**
 * Onboarding Interface (ISP).
 *
 * Covers: starting the coach's Square OAuth via the relay, recording Recipient
 * Agreement acceptance, and reading connection/frontend config.
 */
export interface IRelayConnectOnboarding {
  /** Pure URL builder — the browser navigates here to begin Square OAuth via the relay. */
  buildAuthorizeUrl(recipientKey: string, postConnectRedirect?: string): string;
  acceptAgreement(recipientKey: string, version: string): Promise<{ accepted: boolean; version: string }>;
  getFrontendConfig(recipientKey: string): Promise<RelayFrontendConfig>;
  getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus>;
}

/**
 * A one-time charge on the recipient's (coach's) Square merchant via the relay.
 * The relay applies the platform `app_fee_money` from the product's `app_fee_bps`
 * (override per-transaction with `appFeeBps`). Documented input fields: note,
 * referenceId, statementDescriptionIdentifier, buyerEmailAddress.
 */
export interface RelayChargeInput {
  sourceId: string; // Square Web Payments SDK nonce
  amountCents: number;
  currency?: string; // default USD
  idempotencyKey: string;
  appFeeBps?: number; // override the product default (basis points)
  note?: string;
  referenceId?: string; // link to a FieldView record (use purchaseId)
  statementDescriptionIdentifier?: string;
  buyerEmailAddress?: string;
}

/**
 * Result of a relay charge/refund. Response field names are parsed defensively
 * (`raw` carries the full relay body) pending confirmation against the live relay.
 */
export interface RelayChargeResult {
  paymentId: string;
  status: string;
  amountCents: number;
  appFeeCents: number | null;
  processingFeeCents: number | null;
  raw: unknown;
}

export interface RelayRefundInput {
  paymentId: string;
  amountCents: number;
  idempotencyKey: string;
  reason?: string;
}

export interface RelayRefundResult {
  refundId: string;
  status: string;
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
