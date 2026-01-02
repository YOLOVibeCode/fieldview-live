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
    currency: string;
    keywordCode: string;
    keywordStatus: KeywordStatus;
    qrUrl: string;
    streamSourceId?: string;
    createdAt: Date;
    updatedAt: Date;
    cancelledAt?: Date;
}
//# sourceMappingURL=Game.d.ts.map