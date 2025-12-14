/**
 * Game Entity
 * 
 * Represents a monetizable game/event with streaming.
 */

export type GameState = 'draft' | 'active' | 'live' | 'ended' | 'cancelled';

export type KeywordStatus = 'active' | 'disabled' | 'rotated';

export interface Game {
  id: string;
  ownerAccountId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  endsAt?: Date;
  state: GameState;
  priceCents: number;
  currency: string; // Default: USD
  keywordCode: string; // Unique globally or per-owner
  keywordStatus: KeywordStatus;
  qrUrl: string;
  streamSourceId?: string; // Links to StreamSource
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}
