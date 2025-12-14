/**
 * Game Repository Implementation
 * 
 * Prisma-based implementation of IGameReader and IGameWriter.
 */

import type { PrismaClient, Game } from '@prisma/client';

import type { IGameReader, IGameWriter, CreateGameData, UpdateGameData, ListGamesParams } from '../IGameRepository';

export class GameRepository implements IGameReader, IGameWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<Game | null> {
    return this.prisma.game.findUnique({
      where: { id },
    });
  }

  async getByKeywordCode(keywordCode: string): Promise<Game | null> {
    return this.prisma.game.findUnique({
      where: { keywordCode },
    });
  }

  async list(params: ListGamesParams): Promise<{ games: Game[]; total: number }> {
    const { ownerAccountId, state, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: { ownerAccountId: string; state?: string } = {
      ownerAccountId,
    };

    if (state) {
      where.state = state;
    }

    const [games, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.game.count({ where }),
    ]);

    return { games, total };
  }

  async existsKeywordCode(keywordCode: string): Promise<boolean> {
    const count = await this.prisma.game.count({
      where: { keywordCode },
    });
    return count > 0;
  }

  async create(data: CreateGameData): Promise<Game> {
    return this.prisma.game.create({
      data: {
        ...data,
        currency: data.currency || 'USD',
        state: 'draft',
        keywordStatus: 'active',
      },
    });
  }

  async update(id: string, data: UpdateGameData): Promise<Game> {
    return this.prisma.game.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.game.delete({
      where: { id },
    });
  }
}
