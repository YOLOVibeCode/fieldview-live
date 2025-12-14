/**
 * Game Repository Interfaces (ISP)
 * 
 * Segregated interfaces for Game CRUD operations.
 */

import type { Game } from '@prisma/client';

export interface CreateGameData {
  ownerAccountId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  endsAt?: Date;
  priceCents: number;
  currency?: string;
  keywordCode: string;
  qrUrl: string;
  streamSourceId?: string;
}

export interface UpdateGameData {
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  startsAt?: Date;
  endsAt?: Date | null;
  priceCents?: number;
  currency?: string;
  state?: string;
  keywordCode?: string;
  keywordStatus?: string;
  qrUrl?: string;
  streamSourceId?: string;
  cancelledAt?: Date | null;
}

export interface ListGamesParams {
  ownerAccountId: string;
  state?: string;
  page?: number;
  limit?: number;
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading Game data.
 */
export interface IGameReader {
  getById(id: string): Promise<Game | null>;
  getByKeywordCode(keywordCode: string): Promise<Game | null>;
  list(params: ListGamesParams): Promise<{ games: Game[]; total: number }>;
  existsKeywordCode(keywordCode: string): Promise<boolean>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing Game data.
 */
export interface IGameWriter {
  create(data: CreateGameData): Promise<Game>;
  update(id: string, data: UpdateGameData): Promise<Game>;
  delete(id: string): Promise<void>;
}
