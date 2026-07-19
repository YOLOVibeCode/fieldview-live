/**
 * Noctusoft Relay — Square Connect Hub config.
 *
 * FieldView routes all Square marketplace traffic through the relay's Connect Hub
 * (`<baseUrl>/connect/<product>/*`). The relay holds every coach's Square OAuth
 * tokens and performs the 90/10 split via `app_fee_money`, so this repo holds NO
 * Square secrets — only the relay deploy key. See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

export interface RelayConfig {
  /** e.g. https://api.square.noctusoft.com */
  baseUrl: string;
  /** Connect Hub product key, e.g. "fieldview" */
  productKey: string;
  /** Relay deploy key (`nsins_dk_...`), sent as `Authorization: Bearer`. */
  apiKey: string;
}

export function getRelayConfig(): RelayConfig {
  return {
    baseUrl: process.env.NOCTUSOFT_RELAY_SQUARE_BASE_URL || 'https://api.square.noctusoft.com',
    productKey: process.env.NOCTUSOFT_PRODUCT_KEY || 'fieldview',
    apiKey: process.env.NOCTUSOFT_API_KEY || '',
  };
}

/** True once the relay deploy key is configured (Slice 0 provisioning done). */
export function isRelayConfigured(): boolean {
  return (process.env.NOCTUSOFT_API_KEY || '').length > 0;
}
