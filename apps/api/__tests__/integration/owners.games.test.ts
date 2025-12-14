import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { GameService } from '@/services/GameService';
import { verifyToken } from '@/lib/jwt';
import * as ownersGamesRoute from '@/routes/owners.games';
import type { Game } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

describe('Game Management Routes', () => {
  let request: SuperTest<typeof app>;
  let mockGameService: {
    createGame: ReturnType<typeof vi.fn>;
    listGames: ReturnType<typeof vi.fn>;
    getGameById: ReturnType<typeof vi.fn>;
    updateGame: ReturnType<typeof vi.fn>;
    deleteGame: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockGameService = {
      createGame: vi.fn(),
      listGames: vi.fn(),
      getGameById: vi.fn(),
      updateGame: vi.fn(),
      deleteGame: vi.fn(),
    };

    // Set the mocked service
    ownersGamesRoute.setGameService(mockGameService as any);
  });

  describe('POST /api/owners/games', () => {
    it('creates a game for authenticated owner', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      const gameData = {
        title: 'Test Game',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startsAt: '2024-01-01T12:00:00Z',
        priceCents: 1000,
      };

      const createdGame = {
        id: 'game-1',
        ownerAccountId: 'owner-1',
        keywordCode: 'ABCDEF',
        qrUrl: 'data:image/png;base64,...',
        ...gameData,
      } as Game;

      mockGameService.createGame.mockResolvedValue(createdGame);

      const response = await request
        .post('/api/owners/games')
        .set('Authorization', 'Bearer valid-token')
        .send(gameData)
        .expect(201);

      expect(response.body.id).toBe('game-1');
      expect(response.body.keywordCode).toBe('ABCDEF');
      // Zod adds default currency, so expect it in the call
      expect(mockGameService.createGame).toHaveBeenCalledWith('owner-1', {
        ...gameData,
        currency: 'USD',
      });
    });

    it('returns 401 if not authenticated', async () => {
      await request
        .post('/api/owners/games')
        .send({
          title: 'Test Game',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startsAt: '2024-01-01T12:00:00Z',
          priceCents: 1000,
        })
        .expect(401);
    });

    it('returns 400 if validation fails', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      await request
        .post('/api/owners/games')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: '', // Invalid: empty
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startsAt: 'invalid-date',
          priceCents: -100, // Invalid: negative
        })
        .expect(400);
    });
  });

  describe('GET /api/owners/games', () => {
    it('lists games for authenticated owner', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      const games = [
        { id: 'game-1', ownerAccountId: 'owner-1', title: 'Game 1' },
        { id: 'game-2', ownerAccountId: 'owner-1', title: 'Game 2' },
      ] as Game[];

      mockGameService.listGames.mockResolvedValue({
        games,
        total: 2,
      });

      const response = await request
        .get('/api/owners/games')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('filters by state when provided', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      mockGameService.listGames.mockResolvedValue({
        games: [],
        total: 0,
      });

      await request
        .get('/api/owners/games?state=active')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockGameService.listGames).toHaveBeenCalledWith('owner-1', 'active', undefined, undefined);
    });
  });

  describe('GET /api/owners/games/:id', () => {
    it('returns game when owner matches', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      const game = { id: 'game-1', ownerAccountId: 'owner-1', title: 'Test Game' } as Game;
      mockGameService.getGameById.mockResolvedValue(game);

      const response = await request
        .get('/api/owners/games/game-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.id).toBe('game-1');
    });

    it('returns 404 when game not found', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      mockGameService.getGameById.mockResolvedValue(null);

      await request
        .get('/api/owners/games/game-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  describe('PATCH /api/owners/games/:id', () => {
    it('updates game when owner matches', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      const updatedGame = { id: 'game-1', ownerAccountId: 'owner-1', title: 'Updated Title' } as Game;
      mockGameService.updateGame.mockResolvedValue(updatedGame);

      const response = await request
        .patch('/api/owners/games/game-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/owners/games/:id', () => {
    it('deletes game when owner matches', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });

      mockGameService.deleteGame.mockResolvedValue();

      await request
        .delete('/api/owners/games/game-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(mockGameService.deleteGame).toHaveBeenCalledWith('game-1', 'owner-1');
    });
  });
});
