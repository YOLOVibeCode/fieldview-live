/**
 * Relay Connect Hub client — Stripe Connect marketplace via Noctusoft relay.
 */

import { BadRequestError } from '../lib/errors';
import type { RelayConfig } from '../lib/relay';

import type {
  IRelayConnectOnboarding,
  IRelayConnectPayments,
  RelayAgreementResult,
  RelayChargeInput,
  RelayChargeResult,
  RelayOnboardInput,
  RelayOnboardResult,
  RelayRecipientStatus,
  RelayRefundInput,
  RelayRefundResult,
} from './IRelayConnectHubService';

type FetchFn = typeof globalThis.fetch;

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

  private async throwRelayError(res: Response, prefix: string): Promise<never> {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    const detail = data.error || `HTTP ${res.status}`;
    const code = data.code;
    throw new BadRequestError(code ? `${prefix}: ${detail} [${code}]` : `${prefix}: ${detail}`);
  }

  async onboard(recipientKey: string, input: RelayOnboardInput): Promise<RelayOnboardResult> {
    const res = await this.fetchFn(`${this.recipientBase(recipientKey)}/onboard`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
        ...(input.email ? { email: input.email } : {}),
      }),
    });
    if (!res.ok) {
      return this.throwRelayError(res, 'Relay onboard failed');
    }
    const body = (await res.json()) as { url?: string; stripe_account_id?: string };
    if (!body.url || !body.stripe_account_id) {
      throw new BadRequestError('Relay onboard response missing url or stripe_account_id');
    }
    return { url: body.url, stripeAccountId: body.stripe_account_id };
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

  async getRecipientStatus(recipientKey: string): Promise<RelayRecipientStatus> {
    const res = await this.fetchFn(this.recipientBase(recipientKey), {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      return {
        connected: false,
        recipientKey,
        stripeAccountId: null,
        connectedAt: null,
        agreementVersionAccepted: null,
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      charges_enabled?: boolean;
      stripe_account_id?: string | null;
      connected_at?: string | null;
      agreement_version_accepted?: string | null;
    };
    return {
      connected: Boolean(body.charges_enabled),
      recipientKey,
      stripeAccountId: body.stripe_account_id ?? null,
      connectedAt: body.connected_at ?? null,
      agreementVersionAccepted: body.agreement_version_accepted ?? null,
    };
  }

  async charge(recipientKey: string, input: RelayChargeInput): Promise<RelayChargeResult> {
    const body: Record<string, unknown> = {
      amount_cents: input.amountCents,
      success_url: input.successUrl,
      idempotency_key: input.idempotencyKey,
      ...(input.cancelUrl && { cancel_url: input.cancelUrl }),
      ...(input.appFeeBps !== undefined && { app_fee_bps: input.appFeeBps }),
      ...(input.note && { note: input.note }),
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

    const data = (await res.json()) as {
      url?: string;
      sessionId?: string;
      payment?: { id?: string; application_fee_amount?: number };
    };
    if (!data.url || !data.sessionId) {
      throw new BadRequestError('Relay charge response missing url or sessionId');
    }
    const paymentIntentId = typeof data.payment?.id === 'string' ? data.payment.id : null;
    const appFeeCents =
      typeof data.payment?.application_fee_amount === 'number' ? data.payment.application_fee_amount : null;

    return {
      checkoutUrl: data.url,
      sessionId: data.sessionId,
      paymentIntentId,
      appFeeCents,
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

    const data = (await res.json()) as { refund?: { id?: string; status?: string; amount?: number } };
    const r = data.refund ?? {};
    return {
      refundId: typeof r.id === 'string' ? r.id : '',
      status: typeof r.status === 'string' ? r.status : 'unknown',
      amountCents: typeof r.amount === 'number' ? r.amount : input.amountCents,
      raw: data,
    };
  }
}
