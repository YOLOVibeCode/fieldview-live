/**
 * Marketplace store service interfaces (Noctusoft store, Connect Hub).
 */

export type {
  IMarketplaceStoreOnboarding,
  IMarketplaceStorePayments,
  MarketplaceCheckoutInput,
  MarketplaceCheckoutResult,
  MarketplaceOnboardingDetails,
  MarketplaceRefundInput,
  MarketplaceSellerStatus,
} from './MarketplaceStoreService';

import type { IMarketplaceStoreOnboarding, IMarketplaceStorePayments } from './MarketplaceStoreService';

export type IMarketplaceStoreService = IMarketplaceStoreOnboarding & IMarketplaceStorePayments;
