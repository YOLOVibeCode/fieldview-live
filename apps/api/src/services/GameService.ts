/**
 * Game Service Implementation
 * 
 * Implements IGameReader and IGameWriter.
 * Handles game CRUD operations with keyword and QR code generation.
 */

import { ForbiddenError, NotFoundError } from '../lib/errors';
import type { IGameReader as IGameRepoReader, IGameWriter as IGameRepoWriter } from '../repositories/IGameRepository';
import type { IKeywordGenerator } from './IKeywordService';
import type { IQRCodeGenerator } from './IQRCodeService';
import type { IGameReader, IGameWriter, CreateGameRequest, UpdateGameRequest } from './IGameService';
import type { Game } from '@prisma/client';

export class GameService implements IGameReader, IGameWriter {
  constructor(
    private gameRepo: IGameRepoReader & IGameRepoWriter,
    private keywordGenerator: IKeywordGenerator,
    private qrCodeGenerator: IQRCodeGenerator
  ) {}

  async getGameById(id: string, ownerAccountId: string): Promise<Game | null> {
    const game = await this.gameRepo.getById(id);
    if (!game) {
      return null;
    }

    // Verify ownership
    if (game.ownerAccountId !== ownerAccountId) {
      throw new ForbiddenError('Game not found or access denied');
    }

    return game;
  }

  async listGames(ownerAccountId: string, state?: string, page = 1, limit = 20): Promise<{ games: Game[]; total: number }> {
    return this.gameRepo.list({
      ownerAccountId,
      state,
      page,
      limit,
    });
  }

  async createGame(ownerAccountId: string, data: CreateGameRequest): Promise<Game> {
    // Generate unique keyword
    const keywordCode = await this.keywordGenerator.generateUniqueKeyword();

    // Generate QR code
    const qrUrl = await this.qrCodeGenerator.generateQRCodeUrl(keywordCode);

    // Create game
    return this.gameRepo.create({
      ownerAccountId,
      title: data.title,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      priceCents: data.priceCents,
      currency: data.currency || 'USD',
      keywordCode,
      qrUrl,
    });
  }

  async updateGame(id: string, ownerAccountId: string, data: UpdateGameRequest): Promise<Game> {
    // Verify ownership
    const existingGame = await this.getGameById(id, ownerAccountId);
    if (!existingGame) {
      throw new NotFoundError('Game not found');
    }

    // Prepare update data
    const updateData: Parameters<typeof this.gameRepo.update>[1] = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.homeTeam !== undefined) updateData.homeTeam = data.homeTeam;
    if (data.awayTeam !== undefined) updateData.awayTeam = data.awayTeam;
    if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) {
      updateData.endsAt = data.endsAt === null ? null : new Date(data.endsAt);
    }
    if (data.priceCents !== undefined) updateData.priceCents = data.priceCents;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.state !== undefined) updateData.state = data.state;

    return this.gameRepo.update(id, updateData);
  }

  async deleteGame(id: string, ownerAccountId: string): Promise<void> {
    // Verify ownership
    const existingGame = await this.getGameById(id, ownerAccountId);
    if (!existingGame) {
      throw new NotFoundError('Game not found');
    }

    await this.gameRepo.delete(id);
  }
}
