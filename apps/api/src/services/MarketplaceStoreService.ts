/**
 * FieldView's adapter over @noctusoft/store-client — the relay's own client —
 * for marketplace payments: coach onboarding, viewer buy links, refunds.
 *
 * Every relay call goes through client.marketplace(product).seller(key), so the
 * only paths FieldView ever uses are the Connect Hub routes the relay documents
 * (noctusoft-relay docs/api/store/README.md, "Marketplace"; see
 * packages/store-client/VENDORED.md). Buy links are signed locally with the
 * product's Connect key and never touch the relay until the viewer clicks.
 */

import { createStoreClient, signConnectBuyLink, StoreError } from '@noctusoft/store-client';
import type { SellerClient, StoreClient } from '@noctusoft/store-client';

import { AppError } from '../lib/errors';
import { marketplaceSigningSecret } from '../lib/marketplace';
import type { MarketplaceConfig } from '../lib/marketplace';

/** What the relay knows about a coach's seller (GET …/recipients/:seller). */
export interface MarketplaceSellerStatus {
  /** false when the relay has no recipient row yet: the coach has not accepted the agreement. */
  exists: boolean;
  /** The seller can take charges right now (chargesEnabled, not pending or disconnected). */
  connected: boolean;
  /** Relay seller status: not_connected | pending | active | restricted | disconnected | action_required. */
  status: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** Opaque seller ref on the relay (shown as the merchant id). */
  sellerRef: string | null;
  mode: 'test' | 'live' | null;
  agreementAccepted: boolean;
  agreementVersion: string | null;
  agreementAcceptedAt: string | null;
}

export interface MarketplaceOnboardingDetails {
  /** Prefills the provider's form. */
  email?: string;
  /** What the seller sells, at most 200 characters. */
  productDescription?: string;
}

export interface IMarketplaceStoreOnboarding {
  acceptAgreement(sellerKey: string, version: string): Promise<{ version: string; acceptedAt: string | null }>;
  buildOnboardingUrl(sellerKey: string, returnUrl: string, details?: MarketplaceOnboardingDetails): Promise<string>;
  getSellerStatus(sellerKey: string): Promise<MarketplaceSellerStatus>;
}

export interface MarketplaceCheckoutInput {
  sellerKey: string;
  amountCents: number;
  currency: string;
  purchaseId: string;
  successUrl: string;
  cancelUrl: string;
  /** Required by the relay at the viewer's click; refused here so it fails before the redirect. */
  buyerEmail?: string;
  /** What the viewer sees they pay for on the hosted page (up to 120 characters). */
  description?: string;
}

export interface MarketplaceCheckoutResult {
  checkoutUrl: string;
  /** `buy:<nonce>`: the relay's idempotency key for this link. */
  checkoutId: string | null;
  /** Unknown until the paid event arrives (refs.paymentId). */
  paymentId: string | null;
}

export interface MarketplaceRefundInput {
  sellerKey: string;
  /** The opaque paymentRef the paid event delivered (Purchase.paymentProviderPaymentId). */
  paymentId: string;
  amountCents: number;
  refundId: string;
  reason?: string;
}

export interface IMarketplaceStorePayments {
  createCheckout(input: MarketplaceCheckoutInput): Promise<MarketplaceCheckoutResult>;
  refund(input: MarketplaceRefundInput): Promise<void>;
}

type FetchFn = typeof globalThis.fetch;

const BUY_LINK_TTL_SECONDS = 24 * 60 * 60;

/** Seller states in which the relay takes no charge, whatever chargesEnabled says. */
const NOT_SELLING = new Set(['pending', 'disconnected']);

const NOT_STARTED: MarketplaceSellerStatus = Object.freeze({
  exists: false,
  connected: false,
  status: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  sellerRef: null,
  mode: null,
  agreementAccepted: false,
  agreementVersion: null,
  agreementAcceptedAt: null,
});

function toIsoString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // The relay stores agreement acceptance as unix seconds.
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === 'string' && value) {
    return value;
  }
  return null;
}

export class MarketplaceStoreService implements IMarketplaceStoreOnboarding, IMarketplaceStorePayments {
  private client: StoreClient | null = null;

  constructor(
    private readonly config: MarketplaceConfig,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  private relay(): StoreClient {
    if (!this.client) {
      if (!this.config.apiKey) {
        throw new AppError('STORE_NOT_CONFIGURED', 'NOCTUSOFT_API_KEY is not set; the store cannot be reached.', 503);
      }
      this.client = createStoreClient({
        baseUrl: this.config.storeBaseUrl,
        apiKey: this.config.apiKey,
        fetch: this.fetchFn,
      });
    }
    return this.client;
  }

  private seller(sellerKey: string): SellerClient {
    return this.relay().marketplace(this.config.productKey).seller(sellerKey);
  }

  private toAppError(err: unknown, fallback: string): AppError {
    if (err instanceof AppError) {
      return err;
    }
    if (err instanceof StoreError) {
      return new AppError(err.code || 'STORE_ERROR', err.message || fallback, err.status >= 500 ? 502 : err.status, err.body);
    }
    const message = err instanceof Error ? err.message : String(err);
    return new AppError('STORE_UNAVAILABLE', `${fallback}: ${message}`, 502);
  }

  private async call<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw this.toAppError(err, fallback);
    }
  }

  async acceptAgreement(sellerKey: string, version: string): Promise<{ version: string; acceptedAt: string | null }> {
    const out = (await this.call(() => this.seller(sellerKey).agree({ version }), 'Recording the agreement failed')) as {
      agreement_version_accepted?: unknown;
      agreement_accepted_at?: unknown;
    } | null;
    return {
      version: typeof out?.agreement_version_accepted === 'string' ? out.agreement_version_accepted : version,
      acceptedAt: toIsoString(out?.agreement_accepted_at),
    };
  }

  async buildOnboardingUrl(sellerKey: string, returnUrl: string, details: MarketplaceOnboardingDetails = {}): Promise<string> {
    const body = {
      returnUrl,
      ...(details.email ? { email: details.email } : {}),
      ...(details.productDescription ? { productDescription: details.productDescription } : {}),
    };
    const out = await this.call(() => this.seller(sellerKey).onboard(body), 'Starting payout onboarding failed');
    if (!out?.url) {
      throw new AppError('STORE_ERROR', 'The store returned no onboarding link.', 502);
    }
    return out.url;
  }

  async getSellerStatus(sellerKey: string): Promise<MarketplaceSellerStatus> {
    let view: Record<string, unknown>;
    try {
      view = await this.seller(sellerKey).status();
    } catch (err) {
      if (err instanceof StoreError && err.status === 404) {
        return NOT_STARTED;
      }
      throw this.toAppError(err, 'Reading the seller status failed');
    }
    const status = typeof view.status === 'string' ? view.status : null;
    const chargesEnabled = view.chargesEnabled === true;
    return {
      exists: true,
      connected: chargesEnabled && !NOT_SELLING.has(status ?? ''),
      status,
      chargesEnabled,
      payoutsEnabled: view.payoutsEnabled === true,
      sellerRef: typeof view.sellerRef === 'string' ? view.sellerRef : null,
      mode: view.mode === 'test' || view.mode === 'live' ? view.mode : null,
      agreementAccepted: Boolean(view.agreementAcceptedAt),
      agreementVersion: typeof view.agreementVersion === 'string' ? view.agreementVersion : null,
      agreementAcceptedAt: toIsoString(view.agreementAcceptedAt),
    };
  }

  // The link is signed locally — there is no relay call to await — but callers rely on a rejected promise.
  // eslint-disable-next-line @typescript-eslint/require-await
  async createCheckout(input: MarketplaceCheckoutInput): Promise<MarketplaceCheckoutResult> {
    const secret = marketplaceSigningSecret();
    if (!secret) {
      throw new AppError('STORE_NOT_CONFIGURED', 'FIELDVIEW_WEBHOOK_SECRET is not set; buy links cannot be signed.', 503);
    }
    if (!input.buyerEmail) {
      throw new AppError('BUYER_EMAIL_REQUIRED', "Checkout needs the viewer's email address.", 400);
    }
    const link = signConnectBuyLink({
      secret,
      product: this.config.productKey,
      seller: input.sellerKey,
      amountCents: input.amountCents,
      currency: input.currency,
      user: input.purchaseId,
      email: input.buyerEmail,
      returnUrl: input.successUrl,
      description: input.description,
      ttlSeconds: BUY_LINK_TTL_SECONDS,
      baseUrl: this.config.storeBaseUrl,
    });
    return { checkoutUrl: link.url, checkoutId: `buy:${link.payload.nonce}`, paymentId: null };
  }

  async refund(input: MarketplaceRefundInput): Promise<void> {
    await this.call(
      () =>
        this.seller(input.sellerKey).refund(input.paymentId, {
          amountCents: input.amountCents,
          idempotencyKey: `refund-${input.refundId}`,
          ...(input.reason ? { reason: input.reason } : {}),
        }),
      'Refunding on the store failed',
    );
  }
}
