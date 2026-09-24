/**
 * Relay Connect Hub Service Interfaces (ISP).
 *
 * Stripe Connect marketplace via the Noctusoft relay (`/connect/{product}/*`).
 */

export interface RelayRecipientStatus {
  connected: boolean;
  recipientKey: string;
  stripeAccountId: string | null;
  connectedAt: string | null;
  agreementVersionAccepted: string | null;
}

export interface RelayAgreementResult {
  accepted: boolean;
  version: string;
  acceptedAt: number | null;
}

export interface RelayOnboardInput {
  email?: string;
  refreshUrl: string;
  returnUrl: string;
}

export interface RelayOnboardResult {
  url: string;
  stripeAccountId: string;
}

export interface IRelayConnectOnboarding {
  onboard(recipientKey: string, input: RelayOnboardInput): Promise<RelayOnboardResult>;
  acceptAgreement(recipientKey: string, version: string, ip?: string): Promise<RelayAgreementResult>;
  getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus>;
}

export interface RelayChargeInput {
  amountCents: number;
  successUrl: string;
  cancelUrl?: string;
  idempotencyKey: string;
  appFeeBps?: number;
  note?: string;
  buyerEmailAddress?: string;
}

export interface RelayChargeResult {
  checkoutUrl: string;
  sessionId: string;
  paymentIntentId: string | null;
  appFeeCents: number | null;
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

export interface IRelayConnectPayments {
  charge(recipientKey: string, input: RelayChargeInput): Promise<RelayChargeResult>;
  refund(recipientKey: string, input: RelayRefundInput): Promise<RelayRefundResult>;
}
