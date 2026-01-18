/**
 * FreemiumService Implementation
 *
 * Manages free tier usage (5 games) and subscription upgrades.
 * Implements IFreemiumReader and IFreemiumWriter (ISP).
 */

import type { PrismaClient } from '@prisma/client';

import {
  FREE_GAMES_LIMIT,
  type FreemiumStatus,
  type IFreemiumService,
  type SubscriptionTier,
} from './IFreemiumService';

export class FreemiumService implements IFreemiumService {
  constructor(private readonly prisma: PrismaClient) {}

  // =========================================
  // IFreemiumReader Implementation
  // =========================================

  async getRemainingFreeGames(ownerAccountId: string): Promise<number> {
    const owner = await this.prisma.ownerAccount.findUnique({
      where: { id: ownerAccountId },
      select: {
        freeGamesUsed: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
      },
    });

    if (!owner) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    // Pro subscribers with active subscription get unlimited
    if (this.isSubscriptionActive(owner.subscriptionTier, owner.subscriptionEndsAt)) {
      return Infinity;
    }

    // Free tier: calculate remaining
    const remaining = FREE_GAMES_LIMIT - owner.freeGamesUsed;
    return Math.max(0, remaining);
  }

  async canCreateFreeGame(ownerAccountId: string): Promise<boolean> {
    const remaining = await this.getRemainingFreeGames(ownerAccountId);
    return remaining > 0;
  }

  async getSubscriptionTier(ownerAccountId: string): Promise<SubscriptionTier | null> {
    const owner = await this.prisma.ownerAccount.findUnique({
      where: { id: ownerAccountId },
      select: {
        subscriptionTier: true,
        subscriptionEndsAt: true,
      },
    });

    if (!owner) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    // Only return tier if subscription is active
    if (this.isSubscriptionActive(owner.subscriptionTier, owner.subscriptionEndsAt)) {
      return owner.subscriptionTier as SubscriptionTier;
    }

    return null;
  }

  async getFreemiumStatus(ownerAccountId: string): Promise<FreemiumStatus> {
    const owner = await this.prisma.ownerAccount.findUnique({
      where: { id: ownerAccountId },
      select: {
        freeGamesUsed: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
      },
    });

    if (!owner) {
      throw new Error(`Owner account not found: ${ownerAccountId}`);
    }

    const isActive = this.isSubscriptionActive(
      owner.subscriptionTier,
      owner.subscriptionEndsAt
    );

    const freeGamesRemaining = isActive
      ? Infinity
      : Math.max(0, FREE_GAMES_LIMIT - owner.freeGamesUsed);

    return {
      freeGamesUsed: owner.freeGamesUsed,
      freeGamesRemaining,
      freeGamesLimit: FREE_GAMES_LIMIT,
      subscriptionTier: isActive ? (owner.subscriptionTier as SubscriptionTier) : null,
      subscriptionEndsAt: isActive ? owner.subscriptionEndsAt : null,
      canCreateFreeGame: freeGamesRemaining > 0,
    };
  }

  // =========================================
  // IFreemiumWriter Implementation
  // =========================================

  async incrementFreeGameUsage(ownerAccountId: string): Promise<void> {
    await this.prisma.ownerAccount.update({
      where: { id: ownerAccountId },
      data: {
        freeGamesUsed: {
          increment: 1,
        },
      },
    });
  }

  async recordGameCreated(
    ownerAccountId: string,
    options: { paywallEnabled: boolean }
  ): Promise<void> {
    // Only count against free tier if no paywall
    if (!options.paywallEnabled) {
      await this.incrementFreeGameUsage(ownerAccountId);
    }
    // Paid games don't count against free limit
  }

  async upgradeToTier(
    ownerAccountId: string,
    tier: SubscriptionTier,
    durationMonths: number = 1
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationMonths * 30);

    await this.prisma.ownerAccount.update({
      where: { id: ownerAccountId },
      data: {
        subscriptionTier: tier,
        subscriptionEndsAt: expiresAt,
      },
    });
  }

  async recordPayPerStream(ownerAccountId: string): Promise<void> {
    // Pay-per-stream doesn't change the counter
    // It's tracked separately via purchases
    // This is a placeholder for future billing integration
  }

  async resetFreeGames(ownerAccountId: string): Promise<void> {
    await this.prisma.ownerAccount.update({
      where: { id: ownerAccountId },
      data: {
        freeGamesUsed: 0,
      },
    });
  }

  // =========================================
  // Private Helpers
  // =========================================

  private isSubscriptionActive(
    tier: string | null,
    expiresAt: Date | null
  ): boolean {
    if (!tier || tier === 'free') {
      return false;
    }

    if (!expiresAt) {
      return false;
    }

    return expiresAt.getTime() > Date.now();
  }
}
