/**
 * Admin Service Implementation
 * 
 * Implements IAdminReader.
 * Handles admin search, purchase timeline, and game audience.
 */

import { NotFoundError } from '../lib/errors';
import type { IEntitlementReader } from '../repositories/IEntitlementRepository';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IPlaybackSessionReader } from '../repositories/IPlaybackSessionRepository';
import type { IPurchaseReader } from '../repositories/IPurchaseRepository';
import type { IRefundReader } from '../repositories/IRefundRepository';
import type { IViewerIdentityReader } from '../repositories/IViewerIdentityRepository';
import { maskEmail } from '../utils/emailMasking';

import { AudienceService } from './AudienceService';
import type { IAdminReader, SearchResults, PurchaseTimeline } from './IAdminService';

const SUPER_ADMIN_ROLE = 'super_admin';

export class AdminService implements IAdminReader {
  constructor(
    private gameReader: IGameReader,
    private purchaseReader: IPurchaseReader,
    private entitlementReader: IEntitlementReader,
    private playbackSessionReader: IPlaybackSessionReader,
    private viewerIdentityReader: IViewerIdentityReader,
    private refundReader: IRefundReader,
    private audienceService: AudienceService
  ) {}

  async search(query: string, adminRole: string): Promise<SearchResults> {
    const isSuperAdmin = adminRole === SUPER_ADMIN_ROLE;
    const queryLower = query.toLowerCase().trim();

    // Search viewers by email or phone
    const viewers = await this.searchViewers(queryLower, isSuperAdmin);

    // Search games by keyword or title
    const games = await this.searchGames(queryLower);

    // Search purchases by ID or viewer email
    const purchases = await this.searchPurchases(queryLower, isSuperAdmin);

    return {
      viewers,
      games,
      purchases,
    };
  }

  async getPurchaseTimeline(purchaseId: string, adminRole: string): Promise<PurchaseTimeline> {
    const isSuperAdmin = adminRole === SUPER_ADMIN_ROLE;

    // Get purchase
    const purchase = await this.purchaseReader.getById(purchaseId);
    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    // Get viewer
    const viewer = await this.viewerIdentityReader.getById(purchase.viewerId);
    if (!viewer) {
      throw new NotFoundError('Viewer not found');
    }

    // Get game
    const game = purchase.gameId ? await this.gameReader.getById(purchase.gameId) : null;
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Build timeline events
    const events = await this.buildTimelineEvents(purchaseId);

    return {
      purchaseId,
      purchase: {
        id: purchase.id,
        gameId: purchase.gameId ?? '',
        gameTitle: game.title ?? '',
        viewerId: purchase.viewerId,
        viewerEmail: isSuperAdmin ? viewer.email : maskEmail(viewer.email),
        viewerEmailMasked: isSuperAdmin ? undefined : maskEmail(viewer.email),
        amountCents: purchase.amountCents,
        status: purchase.status,
        createdAt: purchase.createdAt,
        paidAt: purchase.paidAt,
      },
      events,
    };
  }

  async getGameAudience(
    gameId: string,
    ownerId: string,
    adminRole: string
  ): Promise<import('./IAudienceService').GameAudience> {
    const isSuperAdmin = adminRole === SUPER_ADMIN_ROLE;
    // Use AudienceService but with unmasked emails for SuperAdmin
    return this.audienceService.getGameAudience(gameId, ownerId, !isSuperAdmin);
  }

  private async searchViewers(query: string, isSuperAdmin: boolean): Promise<import('./IAdminService').SearchResultViewer[]> {
    const viewers: import('./IAdminService').SearchResultViewer[] = [];

    // Search by email (exact match)
    try {
      const viewersByEmail = await this.viewerIdentityReader.getByEmail(query);
      if (viewersByEmail) {
        const purchases = await this.purchaseReader.listByViewerId(viewersByEmail.id);
        viewers.push({
          id: viewersByEmail.id,
          email: isSuperAdmin ? viewersByEmail.email : maskEmail(viewersByEmail.email),
          emailMasked: isSuperAdmin ? undefined : maskEmail(viewersByEmail.email),
          phoneE164: viewersByEmail.phoneE164 || undefined,
          purchaseCount: purchases.length,
        });
        return viewers; // Found by email, return early
      }
    } catch {
      // Email search failed, continue
    }

    // Search by phone (if query looks like phone)
    if (query.startsWith('+') || /^\d/.test(query)) {
      try {
        const viewersByPhone = await this.viewerIdentityReader.getByPhone(query);
        if (viewersByPhone) {
          const purchases = await this.purchaseReader.listByViewerId(viewersByPhone.id);
          viewers.push({
            id: viewersByPhone.id,
            email: isSuperAdmin ? viewersByPhone.email : maskEmail(viewersByPhone.email),
            emailMasked: isSuperAdmin ? undefined : maskEmail(viewersByPhone.email),
            phoneE164: viewersByPhone.phoneE164 || undefined,
            purchaseCount: purchases.length,
          });
        }
      } catch {
        // Phone search failed, continue
      }
    }

    return viewers;
  }

  private async searchGames(query: string): Promise<import('./IAdminService').SearchResultGame[]> {
    // Search by keyword (exact match)
    const gameByKeyword = await this.gameReader.getByKeywordCode(query.toUpperCase());
    const games: import('./IAdminService').SearchResultGame[] = [];

    if (gameByKeyword) {
      // Get owner account name (would need OwnerAccount repository)
      games.push({
        id: gameByKeyword.id,
        title: gameByKeyword.title,
        keywordCode: gameByKeyword.keywordCode,
        ownerAccountId: gameByKeyword.ownerAccountId,
        ownerAccountName: 'Owner', // TODO: Fetch from OwnerAccount repository
      });
    }

    return games;
  }

  private async searchPurchases(query: string, isSuperAdmin: boolean): Promise<import('./IAdminService').SearchResultPurchase[]> {
    const purchases: import('./IAdminService').SearchResultPurchase[] = [];

    // If query looks like a UUID, try to find purchase by ID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
      const purchase = await this.purchaseReader.getById(query);
      if (purchase) {
        const viewer = await this.viewerIdentityReader.getById(purchase.viewerId);
        const game = purchase.gameId ? await this.gameReader.getById(purchase.gameId) : null;
        if (viewer && game) {
          purchases.push({
            id: purchase.id,
            gameId: purchase.gameId ?? '',
            gameTitle: game.title ?? '',
            viewerId: purchase.viewerId,
            viewerEmail: isSuperAdmin ? viewer.email : maskEmail(viewer.email),
            viewerEmailMasked: isSuperAdmin ? undefined : maskEmail(viewer.email),
            amountCents: purchase.amountCents,
            status: purchase.status,
            createdAt: purchase.createdAt,
          });
        }
      }
    }

    return purchases;
  }

  private async buildTimelineEvents(purchaseId: string): Promise<import('./IAdminService').TimelineEvent[]> {
    const events: import('./IAdminService').TimelineEvent[] = [];

    // Get purchase
    const purchase = await this.purchaseReader.getById(purchaseId);
    if (!purchase) {
      return events;
    }

    // Purchase created
    events.push({
      type: 'payment_attempt',
      timestamp: purchase.createdAt,
      description: 'Purchase created',
      metadata: { amountCents: purchase.amountCents, status: purchase.status },
    });

    // Payment success
    if (purchase.paidAt) {
      events.push({
        type: 'payment_success',
        timestamp: purchase.paidAt,
        description: 'Payment succeeded',
        metadata: { amountCents: purchase.amountCents },
      });
    }

    // Entitlement created
    const entitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
    if (entitlement) {
      events.push({
        type: 'entitlement_created',
        timestamp: entitlement.createdAt,
        description: 'Entitlement created',
        metadata: { validFrom: entitlement.validFrom, validTo: entitlement.validTo },
      });

      // Playback sessions
      const sessions = await this.playbackSessionReader.listByEntitlementId(entitlement.id);
      for (const session of sessions) {
        events.push({
          type: 'session_started',
          timestamp: session.startedAt,
          description: 'Playback session started',
          metadata: { sessionId: session.id },
        });

        if (session.endedAt) {
          events.push({
            type: 'session_ended',
            timestamp: session.endedAt,
            description: 'Playback session ended',
            metadata: {
              sessionId: session.id,
              totalWatchMs: session.totalWatchMs,
              bufferEvents: session.bufferEvents,
            },
          });
        }
      }
    }

    // Refunds
    const refunds = await this.refundReader.getByPurchaseId(purchase.id);
    for (const refund of refunds) {
      events.push({
        type: 'refund_issued',
        timestamp: refund.createdAt,
        description: `Refund issued: ${refund.reasonCode}`,
        metadata: {
          refundId: refund.id,
          amountCents: refund.amountCents,
          reasonCode: refund.reasonCode,
        },
      });
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
