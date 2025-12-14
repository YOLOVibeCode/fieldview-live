/**
 * Game Service Interfaces (ISP)
 * 
 * Segregated interfaces for Game management operations.
 */

import type { Game } from '@prisma/client';

export interface CreateGameRequest {
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO 8601
  endsAt?: string; // ISO 8601
  priceCents: number;
  currency?: string;
}

export interface UpdateGameRequest {
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  startsAt?: string;
  endsAt?: string;
  priceCents?: number;
  currency?: string;
  state?: string;
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading Game data.
 */
export interface IGameReader {
  getGameById(id: string, ownerAccountId: string): Promise<Game | null>;
  listGames(ownerAccountId: string, state?: string, page?: number, limit?: number): Promise<{ games: Game[]; total: number }>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing Game data.
 */
export interface IGameWriter {
  createGame(ownerAccountId: string, data: CreateGameRequest): Promise<Game>;
  updateGame(id: string, ownerAccountId: string, data: UpdateGameRequest): Promise<Game>;
  deleteGame(id: string, ownerAccountId: string): Promise<void>;
}
