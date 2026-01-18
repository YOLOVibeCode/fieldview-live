/**
 * Freemium Service Interfaces (ISP)
 *
 * Manages free tier usage tracking and subscription tiers.
 * Following Interface Segregation Principle - separate reader and writer.
 */

export const FREE_GAMES_LIMIT = 5;

export type SubscriptionTier = 'free' | 'pro';

export interface FreemiumStatus {
  freeGamesUsed: number;
  freeGamesRemaining: number;
  freeGamesLimit: number;
  subscriptionTier: SubscriptionTier | null;
  subscriptionEndsAt: Date | null;
  canCreateFreeGame: boolean;
}

export interface AfterLimitOptions {
  enablePaywall: boolean;
  subscribePro: { pricePerMonth: number };
  payPerStream: { pricePerStream: number };
}

/**
 * IFreemiumReader - Read-only operations for freemium status
 */
export interface IFreemiumReader {
  /**
   * Get remaining free games for an owner
   * Returns Infinity for pro subscribers
   */
  getRemainingFreeGames(ownerAccountId: string): Promise<number>;

  /**
   * Check if owner can create a free game (no paywall)
   */
  canCreateFreeGame(ownerAccountId: string): Promise<boolean>;

  /**
   * Get current subscription tier
   */
  getSubscriptionTier(ownerAccountId: string): Promise<SubscriptionTier | null>;

  /**
   * Get complete freemium status summary
   */
  getFreemiumStatus(ownerAccountId: string): Promise<FreemiumStatus>;
}

/**
 * IFreemiumWriter - Write operations for freemium management
 */
export interface IFreemiumWriter {
  /**
   * Increment free game usage counter
   * Called when creating a game without paywall
   */
  incrementFreeGameUsage(ownerAccountId: string): Promise<void>;

  /**
   * Record game creation (handles both free and paid)
   * Only increments counter for free games
   */
  recordGameCreated(
    ownerAccountId: string,
    options: { paywallEnabled: boolean }
  ): Promise<void>;

  /**
   * Upgrade to a subscription tier
   */
  upgradeToTier(
    ownerAccountId: string,
    tier: SubscriptionTier,
    durationMonths?: number
  ): Promise<void>;

  /**
   * Record a pay-per-stream purchase (single free stream addon)
   */
  recordPayPerStream(ownerAccountId: string): Promise<void>;

  /**
   * Reset free game counter (admin only)
   */
  resetFreeGames(ownerAccountId: string): Promise<void>;
}

/**
 * Combined interface for full service
 */
export interface IFreemiumService extends IFreemiumReader, IFreemiumWriter {}
