/**
 * Audience Service Implementation
 * 
 * Implements IAudienceReader.
 * Handles owner analytics and game audience monitoring.
 */

import { ForbiddenError, NotFoundError } from '../lib/errors';
import type { IEntitlementReader } from '../repositories/IEntitlementRepository';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IPlaybackSessionReader } from '../repositories/IPlaybackSessionRepository';
import type { IPurchaseReader } from '../repositories/IPurchaseRepository';
import type { IViewerIdentityReader } from '../repositories/IViewerIdentityRepository';
import { maskEmail } from '../utils/emailMasking';

import type { IAudienceReader, OwnerAnalytics, GameAudience } from './IAudienceService';

export class AudienceService implements IAudienceReader {
  constructor(
    private gameReader: IGameReader,
    private purchaseReader: IPurchaseReader,
    private entitlementReader: IEntitlementReader,
    private playbackSessionReader: IPlaybackSessionReader,
    private viewerIdentityReader: IViewerIdentityReader
  ) {}

  async getOwnerAnalytics(ownerAccountId: string): Promise<OwnerAnalytics> {
    // Get all games for owner
    const { games } = await this.gameReader.list({
      ownerAccountId,
      page: 1,
      limit: 1000, // Get all games
    });

    const gameIds = games.map((g) => g.id);

    // Get all purchases for owner's games
    const allPurchases = await Promise.all(
      gameIds.map((gameId) => this.purchaseReader.listByGameId(gameId))
    );
    const purchases = allPurchases.flat();
    const paidPurchases = purchases.filter((p) => p.status === 'paid');

    // Calculate totals
    const totalRevenueCents = paidPurchases.reduce((sum, p) => sum + p.ownerNetCents, 0);
    const totalPurchases = paidPurchases.length;
    const totalGames = games.length;
    const averagePurchaseAmountCents =
      totalPurchases > 0
        ? Math.round(
            paidPurchases.reduce((sum, p) => sum + p.amountCents, 0) / totalPurchases
          )
        : 0;

    // Calculate conversion rate (purchases that have at least one session)
    let watchedCount = 0;
    for (const purchase of paidPurchases) {
      const entitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
      if (entitlement) {
        const sessions = await this.playbackSessionReader.listByEntitlementId(entitlement.id);
        if (sessions.length > 0) {
          watchedCount++;
        }
      }
    }

    const purchaseToWatchConversionRate =
      totalPurchases > 0 ? watchedCount / totalPurchases : 0;

    // Revenue by game
    const revenueByGame = games.map((game) => {
      const gamePurchases = paidPurchases.filter((p) => p.gameId === game.id);
      return {
        gameId: game.id,
        gameTitle: game.title,
        revenueCents: gamePurchases.reduce((sum, p) => sum + p.ownerNetCents, 0),
        purchaseCount: gamePurchases.length,
      };
    });

    // Revenue by month
    const revenueByMonth = this.groupByMonth(paidPurchases);

    return {
      totalRevenueCents,
      totalPurchases,
      totalGames,
      averagePurchaseAmountCents,
      purchaseToWatchConversionRate,
      revenueByGame,
      revenueByMonth,
    };
  }

  async getGameAudience(
    gameId: string,
    ownerAccountId: string,
    maskEmails: boolean
  ): Promise<GameAudience> {
    // Verify game belongs to owner
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }
    if (game.ownerAccountId !== ownerAccountId) {
      throw new ForbiddenError('Game does not belong to owner');
    }

    // Get all purchases for this game
    const purchases = await this.purchaseReader.listByGameId(gameId);
    const paidPurchases = purchases.filter((p) => p.status === 'paid');

    // Get purchasers with viewer identity
    const purchasers = await Promise.all(
      paidPurchases.map(async (purchase) => {
        const viewer = await this.viewerIdentityReader.getById(purchase.viewerId);
        if (!viewer) {
          throw new Error(`Viewer not found for purchase ${purchase.id}`);
        }

        const entitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
        let watched = false;
        if (entitlement) {
          const sessions = await this.playbackSessionReader.listByEntitlementId(entitlement.id);
          watched = sessions.length > 0;
        }

        return {
          purchaseId: purchase.id,
          emailMasked: maskEmails ? maskEmail(viewer.email) : viewer.email,
          purchasedAt: purchase.createdAt,
          amountCents: purchase.amountCents,
          watched,
        };
      })
    );

    // Get watchers (purchases with sessions)
    const watchersData = await Promise.all(
      paidPurchases.map(async (purchase) => {
        const entitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
        if (!entitlement) {
          return null;
        }

        const sessions = await this.playbackSessionReader.listByEntitlementId(entitlement.id);
        if (sessions.length === 0) {
          return null;
        }

        const viewer = await this.viewerIdentityReader.getById(purchase.viewerId);
        if (!viewer) {
          return null;
        }

        const totalWatchMs = sessions.reduce((sum, s) => sum + s.totalWatchMs, 0);
        const firstSession = sessions[0];
        const lastWatchedAt = firstSession
          ? sessions.reduce((latest, s) => {
              return s.startedAt > latest ? s.startedAt : latest;
            }, firstSession.startedAt)
          : null;

        return {
          purchaseId: purchase.id,
          emailMasked: maskEmails ? maskEmail(viewer.email) : viewer.email,
          sessionCount: sessions.length,
          lastWatchedAt,
          totalWatchMs,
        };
      })
    );

    const watchers = watchersData.filter((w): w is NonNullable<typeof w> => w !== null);

    const purchaseToWatchConversionRate =
      purchasers.length > 0 ? watchers.length / purchasers.length : 0;

    return {
      gameId,
      purchasers,
      watchers,
      purchaseToWatchConversionRate,
    };
  }

  /**
   * Group purchases by month (YYYY-MM format)
   */
  private groupByMonth(
    purchases: Array<{ createdAt: Date; ownerNetCents: number }>
  ): Array<{ month: string; revenueCents: number; purchaseCount: number }> {
    const monthMap = new Map<string, { revenueCents: number; purchaseCount: number }>();

    for (const purchase of purchases) {
      const date = new Date(purchase.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthMap.get(month) || { revenueCents: 0, purchaseCount: 0 };
      monthMap.set(month, {
        revenueCents: existing.revenueCents + purchase.ownerNetCents,
        purchaseCount: existing.purchaseCount + 1,
      });
    }

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        revenueCents: data.revenueCents,
        purchaseCount: data.purchaseCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
