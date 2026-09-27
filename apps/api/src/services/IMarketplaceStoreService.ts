/**
 * Marketplace store service interfaces (Noctusoft store v1).
 */

export type {
  IMarketplaceStoreOnboarding,
  IMarketplaceStorePayments,
  MarketplaceCheckoutInput,
  MarketplaceCheckoutResult,
  MarketplaceRefundInput,
} from './MarketplaceStoreService';

import type { IMarketplaceStoreOnboarding, IMarketplaceStorePayments } from './MarketplaceStoreService';

export type IMarketplaceStoreService = IMarketplaceStoreOnboarding & IMarketplaceStorePayments;
