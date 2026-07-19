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
