/**
 * Thin FieldView wrapper over @fieldview/store-client for marketplace payments.
 */

import { StoreClient } from '@fieldview/store-client';

import { BadRequestError } from '../lib/errors';
import type { MarketplaceConfig } from '../lib/marketplace';

export interface IMarketplaceStoreOnboarding {
  buildOnboardingUrl(sellerKey: string, postConnectRedirect?: string): Promise<string>;
  getSellerStatus(sellerKey: string): Promise<{ connected: boolean; merchantId: string | null; connectedAt: string | null }>;
}

export interface MarketplaceCheckoutInput {
  sellerKey: string;
  amountCents: number;
  currency: string;
  purchaseId: string;
  successUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
}

export interface MarketplaceCheckoutResult {
  checkoutUrl: string;
  paymentId: string | null;
}

export interface MarketplaceRefundInput {
  sellerKey: string;
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

export class MarketplaceStoreService implements IMarketplaceStoreOnboarding, IMarketplaceStorePayments {
  private client: StoreClient;

  constructor(config: MarketplaceConfig, fetchFn: FetchFn = globalThis.fetch) {
    this.client = new StoreClient(
      {
        baseUrl: config.storeBaseUrl,
        productKey: config.productKey,
        apiKey: config.apiKey,
        signingSecret:
          process.env.FIELDVIEW_WEBHOOK_SECRET ||
          process.env.NOCTUSOFT_WEBHOOK_SECRET ||
          '',
      },
      fetchFn,
    );
  }

  async buildOnboardingUrl(sellerKey: string, postConnectRedirect?: string): Promise<string> {
    try {
      return await this.client.getSellerOnboardingUrl(sellerKey, postConnectRedirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestError(message);
    }
  }

  async getSellerStatus(sellerKey: string) {
    const status = await this.client.getSellerStatus(sellerKey);
    return {
      connected: status.connected,
      merchantId: status.merchantId,
      connectedAt: status.connectedAt,
    };
  }

  async createCheckout(input: MarketplaceCheckoutInput): Promise<MarketplaceCheckoutResult> {
    try {
      const result = await this.client.createCheckout({
        sellerKey: input.sellerKey,
        amountCents: input.amountCents,
        currency: input.currency,
        referenceId: input.purchaseId,
        idempotencyKey: input.purchaseId.substring(0, 45),
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        buyerEmail: input.buyerEmail,
        note: `FieldView purchase ${input.purchaseId}`,
      });
      return { checkoutUrl: result.checkoutUrl, paymentId: result.paymentId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestError(message);
    }
  }

  async refund(input: MarketplaceRefundInput): Promise<void> {
    try {
      await this.client.createRefund({
        sellerKey: input.sellerKey,
        paymentId: input.paymentId,
        amountCents: input.amountCents,
        idempotencyKey: `refund-${input.refundId}`,
        reason: input.reason,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestError(message);
    }
  }
}
