/**
 * Admin Service Interfaces (ISP)
 * 
 * Segregated interfaces for admin operations.
 */

import type { GameAudience } from './IAudienceService';

export interface SearchResultViewer {
  id: string;
  email: string; // Full email for SuperAdmin
  emailMasked?: string; // Masked for SupportAdmin
  phoneE164?: string;
  purchaseCount: number;
}

export interface SearchResultGame {
  id: string;
  title: string;
  keywordCode: string;
  ownerAccountId: string;
  ownerAccountName: string;
}

export interface SearchResultPurchase {
  id: string;
  gameId: string;
  gameTitle: string;
  viewerId: string;
  viewerEmail: string; // Full email for SuperAdmin
  viewerEmailMasked?: string; // Masked for SupportAdmin
  amountCents: number;
  status: string;
  createdAt: Date;
}

export interface SearchResults {
  viewers: SearchResultViewer[];
  games: SearchResultGame[];
  purchases: SearchResultPurchase[];
}

export interface TimelineEvent {
  type: string; // 'sms_inbound' | 'sms_outbound' | 'payment_attempt' | 'payment_success' | 'entitlement_created' | 'session_started' | 'session_ended' | 'refund_issued'
  timestamp: Date;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface PurchaseTimeline {
  purchaseId: string;
  purchase: {
    id: string;
    gameId: string;
    gameTitle: string;
    viewerId: string;
    viewerEmail: string; // Full email for SuperAdmin
    viewerEmailMasked?: string; // Masked for SupportAdmin
    amountCents: number;
    status: string;
    createdAt: Date;
    paidAt?: Date | null;
  };
  events: TimelineEvent[];
}

/**
 * Reader Interface (ISP)
 */
export interface IAdminReader {
  search(query: string, adminRole: string): Promise<SearchResults>;
  getPurchaseTimeline(purchaseId: string, adminRole: string): Promise<PurchaseTimeline>;
  getGameAudience(gameId: string, ownerId: string, adminRole: string): Promise<GameAudience>; // Full emails for SuperAdmin
}
