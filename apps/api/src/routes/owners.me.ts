/**
 * Owner Me Routes
 * 
 * GET /api/owners/me - Get current owner account
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';

import { NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';

const router = express.Router();

// Lazy initialization to allow mocking in tests
let ownerAccountRepoInstance: OwnerAccountRepository | null = null;

function getOwnerAccountRepo(): OwnerAccountRepository {
  if (!ownerAccountRepoInstance) {
    ownerAccountRepoInstance = new OwnerAccountRepository(prisma);
  }
  return ownerAccountRepoInstance;
}

// Export for testing
export function setOwnerAccountRepo(repo: OwnerAccountRepository): void {
  ownerAccountRepoInstance = repo;
}

/**
 * GET /api/owners/me
 * 
 * Get current authenticated owner account.
 */
router.get('/me', requireOwnerAuth, (req: AuthRequest, res, next) => {
  (async () => {
    try {
      if (!req.ownerAccountId) {
        return next(new NotFoundError('Owner account not found'));
      }

      const repo = getOwnerAccountRepo();
      const account = await repo.findById(req.ownerAccountId);
      if (!account) {
        return next(new NotFoundError('Owner account not found'));
      }

      res.json(account);
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersMeRouter(): Router {
  return router;
}
