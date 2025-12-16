import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import * as publicGamesRoute from '@/routes/public.games';
import { NotFoundError } from '@/lib/errors';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Public Games Routes', () => {
  let request: SuperTest<typeof app>;
  let mockHandlers: {
    getPublicGameById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);
    mockHandlers = {
      getPublicGameById: vi.fn(),
    };
    publicGamesRoute.setPublicGameHandlers(mockHandlers as any);
  });

  describe('GET /api/public/games/:gameId', () => {
    it('returns game successfully', async () => {
      mockHandlers.getPublicGameById.mockResolvedValue({
        id: 'game-1',
        title: 'Test Game',
        homeTeam: 'A',
        awayTeam: 'B',
        startsAt: new Date().toISOString(),
        priceCents: 700,
        currency: 'USD',
        state: 'active',
        keywordCode: 'EAGLES22',
        ownerAccountId: 'owner-1',
      });

      const response = await request.get('/api/public/games/game-1').expect(200);

      expect(response.body.id).toBe('game-1');
      expect(mockHandlers.getPublicGameById).toHaveBeenCalledWith('game-1');
    });

    it('returns 404 when game not found', async () => {
      mockHandlers.getPublicGameById.mockRejectedValue(new NotFoundError('Game not found'));

      await request.get('/api/public/games/missing').expect(404);
    });
  });
});


