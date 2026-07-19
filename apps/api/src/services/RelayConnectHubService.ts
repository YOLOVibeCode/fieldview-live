/**
 * Relay Connect Hub Service Implementation.
 *
 * Thin client over the Noctusoft Relay's Square Connect Hub
 * (`<baseUrl>/connect/<product>/*`). The relay owns each coach's Square OAuth
 * tokens; FieldView only references them by `recipientKey`.
 *
 * NOTE: relay JSON response field names are handled defensively (snake_case and
 * camelCase both accepted) pending confirmation against the live relay canary.
 *
 * See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import { BadRequestError } from '../lib/errors';
import type { RelayConfig } from '../lib/relay';

import type {
  IRelayConnectOnboarding,
  RelayFrontendConfig,
  RelayRecipientStatus,
} from './IRelayConnectHubService';

type FetchFn = typeof globalThis.fetch;

export class RelayConnectHubService implements IRelayConnectOnboarding {
  constructor(
    private config: RelayConfig,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  private base(): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}/connect/${this.config.productKey}`;
  }

  private recipientBase(recipientKey: string): string {
    return `${this.base()}/recipients/${encodeURIComponent(recipientKey)}`;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  buildAuthorizeUrl(recipientKey: string, postConnectRedirect?: string): string {
    const url = new URL(`${this.base()}/oauth/authorize`);
    url.searchParams.set('recipient_key', recipientKey);
    if (postConnectRedirect) {
      url.searchParams.set('redirect', postConnectRedirect);
    }
    return url.toString();
  }

  async acceptAgreement(recipientKey: string, version: string): Promise<{ accepted: boolean; version: string }> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/agreement`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ version }),
    });
    if (!res.ok) {
      throw new BadRequestError('Relay: failed to record agreement acceptance');
    }
    const body = (await res.json().catch(() => ({}))) as { version?: string };
    return { accepted: true, version: body.version ?? version };
  }

  async getFrontendConfig(recipientKey: string): Promise<RelayFrontendConfig> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/frontend-config`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new BadRequestError('Relay: failed to fetch frontend config');
    }
    const body = (await res.json()) as {
      application_id?: string;
      applicationId?: string;
      environment?: string;
      location_id?: string;
      locationId?: string;
    };
    const applicationId = body.application_id ?? body.applicationId;
    if (!applicationId) {
      throw new BadRequestError('Relay: frontend config missing application_id');
    }
    return {
      applicationId,
      environment: body.environment === 'production' ? 'production' : 'sandbox',
      locationId: body.location_id ?? body.locationId,
    };
  }

  /**
   * Connection status. Derived from whether the relay resolves a frontend-config
   * for this recipient (a connected recipient has a Square seller context).
   * TODO(slice-0): replace with a dedicated relay status endpoint if one exists.
   */
  async getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus> {
    try {
      const cfg = await this.getFrontendConfig(recipientKey);
      return { connected: Boolean(cfg.applicationId), recipientKey };
    } catch {
      return { connected: false, recipientKey };
    }
  }
}
