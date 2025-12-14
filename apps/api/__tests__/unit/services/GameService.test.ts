import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from '@/services/GameService';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { IGameReader as IGameRepoReader, IGameWriter as IGameRepoWriter } from '@/repositories/IGameRepository';
import type { IKeywordGenerator } from '@/services/IKeywordService';
import type { IQRCodeGenerator } from '@/services/IQRCodeService';
import type { Game } from '@prisma/client';

describe('GameService', () => {
  let service: GameService;
  let mockGameRepo: IGameRepoReader & IGameRepoWriter;
  let mockKeywordGenerator: IKeywordGenerator;
  let mockQRCodeGenerator: IQRCodeGenerator;

  beforeEach(() => {
    mockGameRepo = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockKeywordGenerator = {
      generateUniqueKeyword: vi.fn(),
      validateKeyword: vi.fn(),
    };
    mockQRCodeGenerator = {
      generateQRCodeUrl: vi.fn(),
    };
    service = new GameService(mockGameRepo, mockKeywordGenerator, mockQRCodeGenerator);
  });

  describe('getGameById', () => {
    it('returns game when owner matches', async () => {
      const game = { id: 'game-1', ownerAccountId: 'owner-1' } as Game;
      vi.mocked(mockGameRepo.getById).mockResolvedValue(game);

      const result = await service.getGameById('game-1', 'owner-1');

      expect(result).toEqual(game);
    });

    it('returns null when game not found', async () => {
      vi.mocked(mockGameRepo.getById).mockResolvedValue(null);

      const result = await service.getGameById('game-1', 'owner-1');

      expect(result).toBeNull();
    });

    it('throws ForbiddenError when owner does not match', async () => {
      const game = { id: 'game-1', ownerAccountId: 'owner-2' } as Game;
      vi.mocked(mockGameRepo.getById).mockResolvedValue(game);

      await expect(service.getGameById('game-1', 'owner-1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('createGame', () => {
    it('creates game with generated keyword and QR code', async () => {
      const gameData = {
        title: 'Test Game',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startsAt: '2024-01-01T12:00:00Z',
        priceCents: 1000,
      };
      const createdGame = { id: 'game-1', keywordCode: 'ABCDEF', qrUrl: 'data:image/png;base64,...' } as Game;

      vi.mocked(mockKeywordGenerator.generateUniqueKeyword).mockResolvedValue('ABCDEF');
      vi.mocked(mockQRCodeGenerator.generateQRCodeUrl).mockResolvedValue('data:image/png;base64,...');
      vi.mocked(mockGameRepo.create).mockResolvedValue(createdGame);

      const result = await service.createGame('owner-1', gameData);

      expect(result).toEqual(createdGame);
      expect(mockKeywordGenerator.generateUniqueKeyword).toHaveBeenCalled();
      expect(mockQRCodeGenerator.generateQRCodeUrl).toHaveBeenCalledWith('ABCDEF');
      expect(mockGameRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerAccountId: 'owner-1',
          title: 'Test Game',
          keywordCode: 'ABCDEF',
          qrUrl: 'data:image/png;base64,...',
        })
      );
    });
  });

  describe('updateGame', () => {
    it('updates game when owner matches', async () => {
      const existingGame = { id: 'game-1', ownerAccountId: 'owner-1' } as Game;
      const updatedGame = { ...existingGame, title: 'Updated Title' } as Game;

      vi.mocked(mockGameRepo.getById).mockResolvedValue(existingGame);
      vi.mocked(mockGameRepo.update).mockResolvedValue(updatedGame);

      const result = await service.updateGame('game-1', 'owner-1', { title: 'Updated Title' });

      expect(result).toEqual(updatedGame);
      expect(mockGameRepo.update).toHaveBeenCalledWith('game-1', { title: 'Updated Title' });
    });

    it('throws NotFoundError when game not found', async () => {
      vi.mocked(mockGameRepo.getById).mockResolvedValue(null);

      await expect(service.updateGame('game-1', 'owner-1', { title: 'Updated Title' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteGame', () => {
    it('deletes game when owner matches', async () => {
      const existingGame = { id: 'game-1', ownerAccountId: 'owner-1' } as Game;
      vi.mocked(mockGameRepo.getById).mockResolvedValue(existingGame);
      vi.mocked(mockGameRepo.delete).mockResolvedValue();

      await service.deleteGame('game-1', 'owner-1');

      expect(mockGameRepo.delete).toHaveBeenCalledWith('game-1');
    });

    it('throws NotFoundError when game not found', async () => {
      vi.mocked(mockGameRepo.getById).mockResolvedValue(null);

      await expect(service.deleteGame('game-1', 'owner-1')).rejects.toThrow(NotFoundError);
    });
  });
});
