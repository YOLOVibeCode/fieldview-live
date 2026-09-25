/**
 * Noctusoft store marketplace HTTP client (v1).
 * Contract: noctusoft-relay docs/api/store/README.md (Marketplace section).
 */

import crypto from 'crypto';

export interface StoreClientConfig {
  baseUrl: string;
  productKey: string;
  apiKey: string;
}

export interface StoreSellerStatus {
  connected: boolean;
  sellerKey: string;
  merchantId: string | null;
  connectedAt: string | null;
}

export interface StoreCheckoutInput {
  sellerKey: string;
  amountCents: number;
  currency: string;
  referenceId: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
  note?: string;
}

export interface StoreCheckoutResult {
  checkoutUrl: string;
  checkoutId: string | null;
  paymentId: string | null;
}

export interface StoreRefundInput {
  sellerKey: string;
  paymentId: string;
  amountCents: number;
  idempotencyKey: string;
  reason?: string;
}

export interface StoreRefundResult {
  refundId: string;
  status: string;
}


type FetchFn = typeof globalThis.fetch;

export class StoreClient {
  constructor(
    private config: StoreClientConfig,
    private fetchFn: FetchFn = globalThis.fetch,
  ) {}

  storeId(sellerKey: string): string {
    return `${this.config.productKey}@${sellerKey}`;
  }

  private base(): string {
    return this.config.baseUrl.replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  private async parseError(res: Response, prefix: string): Promise<never> {
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const detail = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(`${prefix}: ${detail}`);
  }

  async getSellerOnboardingUrl(sellerKey: string, postConnectRedirect?: string): Promise<string> {
    const url = new URL(
      `${this.base()}/v1/marketplace/products/${encodeURIComponent(this.config.productKey)}/sellers/${encodeURIComponent(sellerKey)}/onboarding`,
    );
    if (postConnectRedirect) {
      url.searchParams.set('redirect', postConnectRedirect);
    }
    const res = await this.fetchFn(url.toString(), { method: 'GET', headers: this.headers() });
    if (!res.ok) {
      await this.parseError(res, 'Store seller onboarding failed');
    }
    const body = (await res.json()) as { onboarding_url?: string; url?: string };
    const onboardingUrl = body.onboarding_url || body.url;
    if (!onboardingUrl) {
      throw new Error('Store seller onboarding failed: missing onboarding_url');
    }
    return onboardingUrl;
  }

  async getSellerStatus(sellerKey: string): Promise<StoreSellerStatus> {
    const res = await this.fetchFn(
      `${this.base()}/v1/marketplace/products/${encodeURIComponent(this.config.productKey)}/sellers/${encodeURIComponent(sellerKey)}`,
      { method: 'GET', headers: this.headers() },
    );
    if (!res.ok) {
      return {
        connected: false,
        sellerKey,
        merchantId: null,
        connectedAt: null,
      };
    }
    const body = (await res.json()) as {
      connected?: boolean;
      merchant_id?: string | null;
      connected_at?: string | null;
    };
    return {
      connected: Boolean(body.connected ?? body.merchant_id),
      sellerKey,
      merchantId: body.merchant_id ?? null,
      connectedAt: body.connected_at ?? null,
    };
  }

  async createCheckout(input: StoreCheckoutInput): Promise<StoreCheckoutResult> {
    const body = {
      store: this.storeId(input.sellerKey),
      amount_cents: input.amountCents,
      currency: input.currency,
      reference_id: input.referenceId,
      idempotency_key: input.idempotencyKey,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.buyerEmail && { buyer_email: input.buyerEmail }),
      ...(input.note && { note: input.note }),
    };
    const res = await this.fetchFn(`${this.base()}/v1/checkout`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      await this.parseError(res, 'Store checkout failed');
    }
    const data = (await res.json()) as {
      checkout_url?: string;
      url?: string;
      buy_link?: string;
      checkout_id?: string;
      payment_id?: string;
    };
    const checkoutUrl = data.checkout_url || data.buy_link || data.url;
    if (!checkoutUrl) {
      throw new Error('Store checkout failed: missing checkout_url');
    }
    return {
      checkoutUrl,
      checkoutId: data.checkout_id ?? null,
      paymentId: data.payment_id ?? null,
    };
  }

  async createRefund(input: StoreRefundInput): Promise<StoreRefundResult> {
    const body = {
      store: this.storeId(input.sellerKey),
      payment_id: input.paymentId,
      amount_cents: input.amountCents,
      idempotency_key: input.idempotencyKey,
      ...(input.reason && { reason: input.reason }),
    };
    const res = await this.fetchFn(`${this.base()}/v1/refunds`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      await this.parseError(res, 'Store refund failed');
    }
    const data = (await res.json()) as { refund_id?: string; id?: string; status?: string };
    return {
      refundId: data.refund_id || data.id || '',
      status: data.status || 'unknown',
    };
  }
}

export function verifyStoreWebhookSignatures(
  rawBody: string,
  callbackUrl: string,
  connectSignature: string | undefined,
  noctusoftSignature: string | undefined,
  secrets: { connectSecret: string; noctusoftSecret: string },
): boolean {
  if (!connectSignature || !noctusoftSignature) {
    return false;
  }
  if (!secrets.connectSecret || !secrets.noctusoftSecret) {
    return false;
  }
  const connectExpected = hmacBase64(secrets.connectSecret, callbackUrl + rawBody);
  const noctusoftExpected = hmacBase64(secrets.noctusoftSecret, rawBody);
  return timingSafeEqual(connectSignature, connectExpected) && timingSafeEqual(noctusoftSignature, noctusoftExpected);
}

function hmacBase64(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
