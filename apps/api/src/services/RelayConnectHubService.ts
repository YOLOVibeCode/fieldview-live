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
  IRelayConnectCustomers,
  IRelayConnectOnboarding,
  IRelayConnectPayments,
  RelayAgreementResult,
  RelayChargeInput,
  RelayChargeResult,
  RelayCreateCustomerInput,
  RelayFrontendConfig,
  RelayRecipientStatus,
  RelayRefundInput,
  RelayRefundResult,
  RelaySavedCard,
} from './IRelayConnectHubService';

type FetchFn = typeof globalThis.fetch;

interface MoneyLike {
  amount?: number;
}

export class RelayConnectHubService
  implements IRelayConnectOnboarding, IRelayConnectPayments, IRelayConnectCustomers
{
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
    const body = (await res.json()) as {
      application_id?: string;
      environment?: string;
      location_id?: string | null;
    };
    if (!body.application_id) {
      throw new BadRequestError('Relay: frontend-config missing application_id');
    }
    return {
      applicationId: body.application_id,
      environment: body.environment === 'production' ? 'production' : 'sandbox',
      locationId: body.location_id ?? null,
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

  private parseCard(raw: Record<string, unknown>): RelaySavedCard | null {
    const id = typeof raw.id === 'string' ? raw.id : '';
    if (!id) return null;
    const cardBrand =
      typeof raw.card_brand === 'string'
        ? raw.card_brand
        : typeof raw.cardBrand === 'string'
          ? raw.cardBrand
          : 'UNKNOWN';
    const last4 =
      typeof raw.last_4 === 'string'
        ? raw.last_4
        : typeof raw.last4 === 'string'
          ? raw.last4
          : '';
    const expMonth =
      typeof raw.exp_month === 'number'
        ? raw.exp_month
        : typeof raw.expMonth === 'number'
          ? raw.expMonth
          : undefined;
    const expYear =
      typeof raw.exp_year === 'number'
        ? raw.exp_year
        : typeof raw.expYear === 'number'
          ? raw.expYear
          : undefined;
    return { id, cardBrand, last4, expMonth, expYear };
  }

  async createCustomer(recipientKey: string, input: RelayCreateCustomerInput): Promise<string> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/customers`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        email: input.email,
        ...(input.givenName && { given_name: input.givenName }),
        ...(input.phone && { phone: input.phone }),
      }),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay create customer failed');
    }
    const data = (await res.json()) as { customer?: Record<string, unknown> };
    const customerId =
      typeof data.customer?.id === 'string'
        ? data.customer.id
        : typeof (data as { customer_id?: string }).customer_id === 'string'
          ? (data as { customer_id: string }).customer_id
          : '';
    if (!customerId) {
      throw new BadRequestError('Relay: create customer missing id');
    }
    return customerId;
  }

  async listCards(recipientKey: string, customerId: string): Promise<RelaySavedCard[]> {
    const res = await this.fetchFn(
      `${this.recipientBase(recipientKey)}/customers/${encodeURIComponent(customerId)}/cards`,
      { method: 'GET', headers: this.headers() },
    );
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay list cards failed');
    }
    const data = (await res.json()) as { cards?: Array<Record<string, unknown>> };
    const cards = data.cards ?? [];
    const cardMap = new Map<string, RelaySavedCard>();
    for (const raw of cards) {
      const parsed = this.parseCard(raw);
      if (!parsed) continue;
      const key = `${parsed.cardBrand}-${parsed.last4}`;
      if (!cardMap.has(key)) {
        cardMap.set(key, parsed);
      }
    }
    return Array.from(cardMap.values());
  }

  async createCard(
    recipientKey: string,
    customerId: string,
    sourceId: string,
  ): Promise<RelaySavedCard | null> {
    const existing = await this.listCards(recipientKey, customerId);
    const res = await this.fetchFn(
      `${this.recipientBase(recipientKey)}/customers/${encodeURIComponent(customerId)}/cards`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ source_id: sourceId }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        squareErrors?: Array<{ code?: string }>;
      };
      const code = data.squareErrors?.[0]?.code || data.code;
      if (code === 'CARD_ALREADY_EXISTS' || code === 'DUPLICATE_CARD') {
        return null;
      }
      return this.throwRelayError(res as Response, 'Relay create card failed');
    }
    const data = (await res.json()) as { card?: Record<string, unknown> };
    const parsed = data.card ? this.parseCard(data.card) : null;
    if (!parsed) {
      throw new BadRequestError('Relay: create card missing card body');
    }
    const duplicate = existing.find((c) => c.last4 === parsed.last4 && c.cardBrand === parsed.cardBrand);
    if (duplicate) {
      try {
        await this.deleteCard(recipientKey, parsed.id);
      } catch {
        // duplicate already on file
      }
      return null;
    }
    return parsed;
  }

  async deleteCard(recipientKey: string, cardId: string): Promise<void> {
    const res = await this.fetchFn(
      `${this.recipientBase(recipientKey)}/cards/${encodeURIComponent(cardId)}`,
      { method: 'DELETE', headers: this.headers() },
    );
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay delete card failed');
    }
  }
}
