/**
 * FreemiumService TDD Tests
 *
 * Tests written BEFORE implementation (TDD approach).
 * Tests IFreemiumReader and IFreemiumWriter interfaces.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { PrismaClient } from '@prisma/client';

import { FreemiumService } from '../../src/services/FreemiumService';
import { FREE_GAMES_LIMIT } from '../../src/services/IFreemiumService';

// Test database client
const prisma = new PrismaClient();

// Helper: Create test owner account
async function createTestOwner(overrides: {
  freeGamesUsed?: number;
  subscriptionTier?: string | null;
  subscriptionEndsAt?: Date | null;
} = {}): Promise<{ id: string; contactEmail: string }> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const owner = await prisma.ownerAccount.create({
    data: {
      type: 'owner',
      name: 'Test Owner',
      status: 'active',
      contactEmail: email,
      freeGamesUsed: overrides.freeGamesUsed ?? 0,
      subscriptionTier: overrides.subscriptionTier ?? null,
      subscriptionEndsAt: overrides.subscriptionEndsAt ?? null,
    },
  });

  return { id: owner.id, contactEmail: owner.contactEmail };
}

// Cleanup helper
async function cleanupTestOwners(): Promise<void> {
  await prisma.ownerAccount.deleteMany({
    where: {
      contactEmail: {
        contains: 'test-',
        endsWith: '@example.com',
      },
    },
  });
}

describe('FreemiumService', () => {
  let service: FreemiumService;

  beforeEach(() => {
    service = new FreemiumService(prisma);
  });

  afterEach(async () => {
    await cleanupTestOwners();
  });

  describe('IFreemiumReader', () => {
    describe('getRemainingFreeGames', () => {
      it('should return 5 for new account', async () => {
        const owner = await createTestOwner();

        const remaining = await service.getRemainingFreeGames(owner.id);

        expect(remaining).toBe(FREE_GAMES_LIMIT);
      });

      it('should return correct count after games used', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 3 });

        const remaining = await service.getRemainingFreeGames(owner.id);

        expect(remaining).toBe(2);
      });

      it('should return 0 when limit reached', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });

        const remaining = await service.getRemainingFreeGames(owner.id);

        expect(remaining).toBe(0);
      });

      it('should return Infinity for pro subscribers', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          freeGamesUsed: 10,
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        const remaining = await service.getRemainingFreeGames(owner.id);

        expect(remaining).toBe(Infinity);
      });

      it('should treat expired pro subscription as free tier', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          freeGamesUsed: 3,
          subscriptionEndsAt: new Date(Date.now() - 1000), // Expired
        });

        const remaining = await service.getRemainingFreeGames(owner.id);

        expect(remaining).toBe(2); // Back to counting
      });
    });

    describe('canCreateFreeGame', () => {
      it('should allow when under limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 4 });

        const canCreate = await service.canCreateFreeGame(owner.id);

        expect(canCreate).toBe(true);
      });

      it('should deny when at limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });

        const canCreate = await service.canCreateFreeGame(owner.id);

        expect(canCreate).toBe(false);
      });

      it('should deny when over limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 10 });

        const canCreate = await service.canCreateFreeGame(owner.id);

        expect(canCreate).toBe(false);
      });

      it('should allow for active pro subscribers regardless of count', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          freeGamesUsed: 100,
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        const canCreate = await service.canCreateFreeGame(owner.id);

        expect(canCreate).toBe(true);
      });

      it('should deny for expired pro subscribers over limit', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          freeGamesUsed: 10,
          subscriptionEndsAt: new Date(Date.now() - 1000), // Expired
        });

        const canCreate = await service.canCreateFreeGame(owner.id);

        expect(canCreate).toBe(false);
      });
    });

    describe('getSubscriptionTier', () => {
      it('should return null for free tier', async () => {
        const owner = await createTestOwner();

        const tier = await service.getSubscriptionTier(owner.id);

        expect(tier).toBeNull();
      });

      it('should return pro for active pro subscription', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        const tier = await service.getSubscriptionTier(owner.id);

        expect(tier).toBe('pro');
      });

      it('should return null for expired pro subscription', async () => {
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          subscriptionEndsAt: new Date(Date.now() - 1000), // Expired
        });

        const tier = await service.getSubscriptionTier(owner.id);

        expect(tier).toBeNull();
      });
    });

    describe('getFreemiumStatus', () => {
      it('should return complete status object for new account', async () => {
        const owner = await createTestOwner();

        const status = await service.getFreemiumStatus(owner.id);

        expect(status).toEqual({
          freeGamesUsed: 0,
          freeGamesRemaining: 5,
          freeGamesLimit: 5,
          subscriptionTier: null,
          subscriptionEndsAt: null,
          canCreateFreeGame: true,
        });
      });

      it('should return correct status for partially used free tier', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 3 });

        const status = await service.getFreemiumStatus(owner.id);

        expect(status.freeGamesUsed).toBe(3);
        expect(status.freeGamesRemaining).toBe(2);
        expect(status.canCreateFreeGame).toBe(true);
      });

      it('should return correct status for exhausted free tier', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });

        const status = await service.getFreemiumStatus(owner.id);

        expect(status.freeGamesRemaining).toBe(0);
        expect(status.canCreateFreeGame).toBe(false);
      });

      it('should return correct status for pro subscriber', async () => {
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const owner = await createTestOwner({
          subscriptionTier: 'pro',
          subscriptionEndsAt: futureDate,
        });

        const status = await service.getFreemiumStatus(owner.id);

        expect(status.subscriptionTier).toBe('pro');
        expect(status.freeGamesRemaining).toBe(Infinity);
        expect(status.canCreateFreeGame).toBe(true);
      });
    });
  });

  describe('IFreemiumWriter', () => {
    describe('incrementFreeGameUsage', () => {
      it('should increment counter by 1', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 2 });

        await service.incrementFreeGameUsage(owner.id);

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.freeGamesUsed).toBe(3);
      });

      it('should increment from 0 to 1', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 0 });

        await service.incrementFreeGameUsage(owner.id);

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.freeGamesUsed).toBe(1);
      });

      it('should still increment at limit (tracking continues)', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });

        await service.incrementFreeGameUsage(owner.id);

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        // We track all usage, even over limit
        expect(updated?.freeGamesUsed).toBe(6);
      });
    });

    describe('recordGameCreated', () => {
      it('should increment for free game (no paywall)', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 2 });

        await service.recordGameCreated(owner.id, { paywallEnabled: false });

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.freeGamesUsed).toBe(3);
      });

      it('should NOT increment for paid game (paywall enabled)', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 2 });

        await service.recordGameCreated(owner.id, { paywallEnabled: true });

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.freeGamesUsed).toBe(2); // Unchanged
      });
    });

    describe('upgradeToTier', () => {
      it('should set subscription tier to pro', async () => {
        const owner = await createTestOwner();

        await service.upgradeToTier(owner.id, 'pro');

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.subscriptionTier).toBe('pro');
        expect(updated?.subscriptionEndsAt).toBeDefined();
      });

      it('should set expiration to 1 month by default', async () => {
        const owner = await createTestOwner();
        const before = Date.now();

        await service.upgradeToTier(owner.id, 'pro');

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        const expiresAt = updated?.subscriptionEndsAt?.getTime() || 0;
        const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

        // Should be approximately 1 month from now
        expect(expiresAt).toBeGreaterThan(before + oneMonthMs - 1000);
        expect(expiresAt).toBeLessThan(before + oneMonthMs + 60000);
      });

      it('should support custom duration', async () => {
        const owner = await createTestOwner();
        const before = Date.now();

        await service.upgradeToTier(owner.id, 'pro', 3); // 3 months

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        const expiresAt = updated?.subscriptionEndsAt?.getTime() || 0;
        const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;

        expect(expiresAt).toBeGreaterThan(before + threeMonthsMs - 1000);
      });
    });

    describe('resetFreeGames', () => {
      it('should reset counter to 0', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });

        await service.resetFreeGames(owner.id);

        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id },
        });
        expect(updated?.freeGamesUsed).toBe(0);
      });
    });
  });
});
