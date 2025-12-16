/**
 * Public Games Routes
 *
 * Handles public game lookup for checkout page (no auth required).
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';

import { NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { GameRepository } from '../repositories/implementations/GameRepository';

interface PublicGameHandlers {
  getPublicGameById(gameId: string): Promise<unknown>;
}

// Lazy initialization (allows test injection)
let handlersInstance: PublicGameHandlers | null = null;

function getHandlers(): PublicGameHandlers {
  if (!handlersInstance) {
    const gameRepo = new GameRepository(prisma);
    handlersInstance = {
      async getPublicGameById(gameId: string) {
        const game = await gameRepo.getById(gameId);
        if (!game) {
          throw new NotFoundError('Game not found');
        }
        // Only expose purchasable games publicly (payment page)
        if (game.state !== 'active' && game.state !== 'live') {
          throw new NotFoundError('Game not found');
        }
        return game;
      },
    };
  }
  return handlersInstance;
}

// Export for testing
export function setPublicGameHandlers(handlers: PublicGameHandlers): void {
  handlersInstance = handlers;
}

const router = express.Router();

/**
 * GET /api/public/games/:gameId
 *
 * Get public game view for checkout page.
 */
router.get('/games/:gameId', (req, res, next) => {
  void (async () => {
    try {
      const gameId = req.params.gameId;
      if (!gameId) {
        throw new NotFoundError('Game not found');
      }

      const handlers = getHandlers();
      const game = await handlers.getPublicGameById(gameId);
      res.json(game);
    } catch (error) {
      next(error);
    }
  })();
});

export function createPublicGamesRouter(): Router {
  return router;
}


