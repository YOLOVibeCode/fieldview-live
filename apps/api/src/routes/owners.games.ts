/**
 * Owner Games Routes
 * 
 * Game CRUD endpoints for authenticated owners.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { GameService } from '../services/GameService';
import type { CreateGameRequest, UpdateGameRequest } from '../services/IGameService';
import { KeywordService } from '../services/KeywordService';
import { QRCodeService } from '../services/QRCodeService';


const router = express.Router();

// Lazy initialization
let gameServiceInstance: GameService | null = null;

function getGameService(): GameService {
  if (!gameServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const keywordService = new KeywordService(gameRepo);
    const qrCodeService = new QRCodeService();
    gameServiceInstance = new GameService(gameRepo, keywordService, qrCodeService);
  }
  return gameServiceInstance;
}

// Export for testing
export function setGameService(service: GameService): void {
  gameServiceInstance = service;
}

// Validation schemas
const CreateGameSchema = z.object({
  title: z.string().min(1).max(200),
  homeTeam: z.string().min(1).max(100),
  awayTeam: z.string().min(1).max(100),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).optional().default('USD'),
});

const UpdateGameSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  homeTeam: z.string().min(1).max(100).optional(),
  awayTeam: z.string().min(1).max(100).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  state: z.enum(['draft', 'active', 'live', 'ended', 'cancelled']).optional(),
});

const ListGamesQuerySchema = z.object({
  state: z.enum(['draft', 'active', 'live', 'ended', 'cancelled']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * POST /api/owners/games
 * 
 * Create a new game.
 */
router.post(
  '/games',
  requireOwnerAuth,
  validateRequest({ body: CreateGameSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameService = getGameService();
        // Zod has validated the body, so it's safe to cast
        const game = await gameService.createGame(req.ownerAccountId, req.body as CreateGameRequest);

        res.status(201).json(game);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/games
 * 
 * List games for authenticated owner.
 */
router.get(
  '/games',
  requireOwnerAuth,
  validateRequest({ query: ListGamesQuerySchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameService = getGameService();
        const { state, page, limit } = req.query as { state?: string; page?: string; limit?: string };
        const result = await gameService.listGames(
          req.ownerAccountId,
          state,
          page ? Number(page) : undefined,
          limit ? Number(limit) : undefined
        );

        res.json({
          data: result.games,
          pagination: {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
            total: result.total,
          },
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/games/:id
 * 
 * Get a specific game by ID.
 */
router.get(
  '/games/:id',
  requireOwnerAuth,
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.id;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Game ID is required' } });
        }

        const gameService = getGameService();
        const game = await gameService.getGameById(gameId, req.ownerAccountId);

        if (!game) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
        }

        res.json(game);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/owners/games/:id
 * 
 * Update a game.
 */
router.patch(
  '/games/:id',
  requireOwnerAuth,
  validateRequest({ body: UpdateGameSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.id;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Game ID is required' } });
        }

        const gameService = getGameService();
        // Zod has validated the body, so it's safe to cast
        const game = await gameService.updateGame(gameId, req.ownerAccountId, req.body as UpdateGameRequest);

        res.json(game);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/owners/games/:id
 * 
 * Delete a game.
 */
router.delete(
  '/games/:id',
  requireOwnerAuth,
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.id;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Game ID is required' } });
        }

        const gameService = getGameService();
        await gameService.deleteGame(gameId, req.ownerAccountId);

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersGamesRouter(): Router {
  return router;
}
