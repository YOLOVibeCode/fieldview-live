/**
 * Relay Connect Hub Service Implementation.
 *
 * Thin client over the Noctusoft Relay's Square Connect Hub
 * (`<baseUrl>/connect/<product>/*`). The relay owns each coach's Square OAuth
 * tokens; FieldView references them by `recipientKey`.
 *
 * Request/response shapes verified against the relay's INTEGRATION.md and the
 * captured 2026-07-19 production canary. See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import { BadRequestError } from '../lib/errors';
import type { RelayConfig } from '../lib/relay';

import type {
  IRelayConnectOnboarding,
  IRelayConnectPayments,
  RelayAgreementResult,
  RelayChargeInput,
  RelayChargeResult,
  RelayFrontendConfig,
  RelayRecipientStatus,
  RelayRefundInput,
  RelayRefundResult,
} from './IRelayConnectHubService';

type FetchFn = typeof globalThis.fetch;

interface MoneyLike {
  amount?: number;
}

export class RelayConnectHubService implements IRelayConnectOnboarding, IRelayConnectPayments {
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

  /** Parse the relay error envelope ({ error, code, squareErrors[] }) and throw a useful message. */
  private async throwRelayError(res: Response, prefix: string): Promise<never> {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      squareErrors?: Array<{ code?: string; detail?: string }>;
    };
    const sq = data.squareErrors?.[0];
    const detail = sq?.detail || data.error || `HTTP ${res.status}`;
    const code = sq?.code || data.code;
    throw new BadRequestError(code ? `${prefix}: ${detail} [${code}]` : `${prefix}: ${detail}`);
  }

  buildAuthorizeUrl(recipientKey: string, postConnectRedirect?: string): string {
    const url = new URL(`${this.base()}/oauth/authorize`);
    url.searchParams.set('recipient_key', recipientKey);
    if (postConnectRedirect) {
      url.searchParams.set('redirect', postConnectRedirect);
    }
    return url.toString();
  }

  async acceptAgreement(recipientKey: string, version: string, ip?: string): Promise<RelayAgreementResult> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/agreement`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ agreement_version: version, ...(ip ? { ip } : {}) }),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay agreement acceptance failed');
    }
    const body = (await res.json().catch(() => ({}))) as {
      agreement_version_accepted?: string;
      agreement_accepted_at?: number;
    };
    return {
      accepted: true,
      version: body.agreement_version_accepted ?? version,
      acceptedAt: typeof body.agreement_accepted_at === 'number' ? body.agreement_accepted_at : null,
    };
  }

  async getFrontendConfig(recipientKey: string): Promise<RelayFrontendConfig> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/frontend-config`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay frontend-config failed');
    }
    const body = (await res.json()) as { application_id?: string; environment?: string };
    if (!body.application_id) {
      throw new BadRequestError('Relay: frontend-config missing application_id');
    }
    return {
      applicationId: body.application_id,
      environment: body.environment === 'production' ? 'production' : 'sandbox',
    };
  }

  /** Connection status from GET /recipients/:key — connected once merchant_id is present. */
  async getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus> {
    const res = await this.fetchFn(this.recipientBase(recipientKey), {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      return {
        connected: false,
        recipientKey,
        merchantId: null,
        connectedAt: null,
        agreementVersionAccepted: null,
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      merchant_id?: string | null;
      connected_at?: string | null;
      agreement_version_accepted?: string | null;
    };
    return {
      connected: Boolean(body.merchant_id),
      recipientKey,
      merchantId: body.merchant_id ?? null,
      connectedAt: body.connected_at ?? null,
      agreementVersionAccepted: body.agreement_version_accepted ?? null,
    };
  }

  async charge(recipientKey: string, input: RelayChargeInput): Promise<RelayChargeResult> {
    const body: Record<string, unknown> = {
      source_id: input.sourceId,
      amount_cents: input.amountCents,
      idempotency_key: input.idempotencyKey,
      ...(input.appFeeBps !== undefined && { app_fee_bps: input.appFeeBps }),
      ...(input.note && { note: input.note }),
      ...(input.referenceId && { reference_id: input.referenceId }),
      ...(input.statementDescriptionIdentifier && {
        statement_description_identifier: input.statementDescriptionIdentifier,
      }),
      ...(input.buyerEmailAddress && { buyer_email_address: input.buyerEmailAddress }),
    };

    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/charge`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay charge failed');
    }

    const data = (await res.json()) as { payment?: Record<string, unknown> };
    const p = (data.payment ?? {}) as Record<string, unknown>;
    const amountMoney = p.amount_money as MoneyLike | undefined;
    const appFeeMoney = p.app_fee_money as MoneyLike | undefined;
    const card = (p.card_details as { card?: { card_brand?: string; last_4?: string } } | undefined)?.card;
    return {
      paymentId: typeof p.id === 'string' ? p.id : '',
      status: typeof p.status === 'string' ? p.status : 'unknown',
      amountCents: typeof amountMoney?.amount === 'number' ? amountMoney.amount : input.amountCents,
      appFeeCents: typeof appFeeMoney?.amount === 'number' ? appFeeMoney.amount : null,
      cardBrand: card?.card_brand ?? null,
      cardLast4: card?.last_4 ?? null,
      receiptUrl: typeof p.receipt_url === 'string' ? p.receipt_url : null,
      raw: data,
    };
  }

  async refund(recipientKey: string, input: RelayRefundInput): Promise<RelayRefundResult> {
    const body: Record<string, unknown> = {
      payment_id: input.paymentId,
      amount_cents: input.amountCents,
      idempotency_key: input.idempotencyKey,
      ...(input.reason && { reason: input.reason }),
    };

    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/refunds`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay refund failed');
    }

    const data = (await res.json()) as { refund?: Record<string, unknown> };
    const r = (data.refund ?? {}) as Record<string, unknown>;
    const amountMoney = r.amount_money as MoneyLike | undefined;
    return {
      refundId: typeof r.id === 'string' ? r.id : '',
      status: typeof r.status === 'string' ? r.status : 'unknown',
      amountCents: typeof amountMoney?.amount === 'number' ? amountMoney.amount : input.amountCents,
      raw: data,
    };
  }
}
