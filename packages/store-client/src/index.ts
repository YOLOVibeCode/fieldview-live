/**
 * Noctusoft store marketplace HTTP client (v1).
 * Contract: noctusoft-relay docs/api/store/README.md (Marketplace section).
 */

import crypto from 'crypto';

export interface StoreClientConfig {
  baseUrl: string;
  productKey: string;
  apiKey: string;
  /** Connect Hub signing secret (FIELDVIEW_WEBHOOK_SECRET). Required for buy links. */
  signingSecret?: string;
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

/**
 * Marketplace buy link: one amount paid to one seller. Signed with the
 * product's Connect signing key. The amount is inside the signature.
 */
export function signConnectBuyLink(args: {
  secret: string;
  product: string;
  seller: string;
  amountCents: number;
  currency?: string;
  user?: string;
  email?: string;
  returnUrl?: string;
  baseUrl: string;
  ttlSeconds?: number;
}): { url: string; checkoutId: string } {
  const { secret, product, seller, amountCents, baseUrl } = args;
  if (!secret || !product || !seller) {
    throw new TypeError('secret, product, and seller are required');
  }
  if (!Number.isInteger(amountCents)) {
    throw new TypeError('amountCents must be a whole number of cents');
  }
  const currency = args.currency ?? 'USD';
  const user = args.user ?? '';
  const email = args.email ?? '';
  const returnUrl = args.returnUrl ?? '';
  const exp = Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 86400);
  const nonce = crypto.randomBytes(12).toString('hex');
  const mac = ['buy-link-v1', 'connect', product, seller, amountCents, currency, user, email, returnUrl, exp, nonce]
    .map((p) => (p == null ? '' : String(p)))
    .join('|');
  const sig = crypto.createHmac('sha256', secret).update(mac).digest('hex');
  const q = new URLSearchParams({
    amount: String(amountCents),
    currency,
    user,
    email,
    return: returnUrl,
    exp: String(exp),
    nonce,
    sig,
  });
  const base = baseUrl.replace(/\/$/, '');
  return {
    url: `${base}/buy/connect/${encodeURIComponent(product)}/${encodeURIComponent(seller)}?${q}`,
    checkoutId: `buy:${nonce}`,
  };
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
    const secret = this.config.signingSecret;
    if (!secret) {
      throw new Error('Store checkout failed: signingSecret is required to mint buy links');
    }
    const link = signConnectBuyLink({
      secret,
      product: this.config.productKey,
      seller: input.sellerKey,
      amountCents: input.amountCents,
      currency: input.currency,
      user: input.referenceId,
      email: input.buyerEmail ?? '',
      returnUrl: input.successUrl,
      baseUrl: this.config.baseUrl,
    });
    return {
      checkoutUrl: link.url,
      checkoutId: link.checkoutId,
      paymentId: null,
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
