/**
 * Audience Service Interfaces (ISP)
 * 
 * Segregated interfaces for audience analytics and monitoring.
 */

export interface OwnerAnalytics {
  totalRevenueCents: number;
  totalPurchases: number;
  totalGames: number;
  averagePurchaseAmountCents: number;
  purchaseToWatchConversionRate: number; // 0-1
  revenueByGame: Array<{
    gameId: string;
    gameTitle: string;
    revenueCents: number;
    purchaseCount: number;
  }>;
  revenueByMonth: Array<{
    month: string; // YYYY-MM
    revenueCents: number;
    purchaseCount: number;
  }>;
}

export interface PurchaserInfo {
  purchaseId: string;
  emailMasked: string;
  purchasedAt: Date;
  amountCents: number;
  watched: boolean;
}

export interface WatcherInfo {
  purchaseId: string;
  emailMasked: string;
  sessionCount: number;
  lastWatchedAt: Date | null;
  totalWatchMs: number;
}

export interface GameAudience {
  gameId: string;
  purchasers: PurchaserInfo[];
  watchers: WatcherInfo[];
  purchaseToWatchConversionRate: number;
}

/**
 * Reader Interface (ISP)
 */
export interface IAudienceReader {
  getGameAudience(gameId: string, ownerAccountId: string, maskEmails: boolean): Promise<GameAudience>;
  getOwnerAnalytics(ownerAccountId: string): Promise<OwnerAnalytics>;
}
