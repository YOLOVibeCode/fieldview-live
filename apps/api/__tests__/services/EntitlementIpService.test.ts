/**
 * EntitlementIpService TDD Tests
 *
 * Tests IP locking for purchased stream access.
 * One purchase = one household (same IP = multiple accesses).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PrismaClient } from '@prisma/client';

import { EntitlementIpService } from '../../src/services/EntitlementIpService';
import { IP_LOCK_GRACE_PERIOD_MS } from '../../src/services/IEntitlementIpService';

const prisma = new PrismaClient();

// Test helpers
async function createTestViewer(): Promise<{ id: string; email: string }> {
  const email = `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const viewer = await prisma.viewerIdentity.create({
    data: { email },
  });
  return { id: viewer.id, email: viewer.email };
}

async function createTestOwner(): Promise<{ id: string }> {
  const email = `owner-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const owner = await prisma.ownerAccount.create({
    data: {
      type: 'owner',
      name: 'Test Owner',
      status: 'active',
      contactEmail: email,
    },
  });
  return { id: owner.id };
}

async function createTestDirectStream(ownerAccountId: string): Promise<{ id: string; slug: string }> {
  const slug = `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const stream = await prisma.directStream.create({
    data: {
      slug,
      title: 'Test Stream',
      ownerAccountId,
      adminPassword: 'hashed',
    },
  });
  return { id: stream.id, slug: stream.slug };
}

async function createTestPurchase(
  viewerId: string,
  directStreamId: string,
  overrides: {
    status?: string;
    lockedIpAddress?: string | null;
    lockedAt?: Date | null;
    lastAccessedAt?: Date | null;
    lastAccessedIp?: string | null;
  } = {}
): Promise<{ id: string }> {
  const purchase = await prisma.purchase.create({
    data: {
      viewerId,
      directStreamId,
      amountCents: 499,
      platformFeeCents: 50,
      processorFeeCents: 30,
      ownerNetCents: 419,
      status: overrides.status ?? 'paid',
      lockedIpAddress: overrides.lockedIpAddress ?? null,
      lockedAt: overrides.lockedAt ?? null,
      lastAccessedAt: overrides.lastAccessedAt ?? null,
      lastAccessedIp: overrides.lastAccessedIp ?? null,
      paidAt: new Date(),
    },
  });
  return { id: purchase.id };
}

async function cleanupTestData(): Promise<void> {
  await prisma.purchase.deleteMany({
    where: {
      viewer: {
        email: { startsWith: 'viewer-', endsWith: '@test.com' },
      },
    },
  });
  await prisma.viewerIdentity.deleteMany({
    where: { email: { startsWith: 'viewer-', endsWith: '@test.com' } },
  });
  await prisma.directStream.deleteMany({
    where: { slug: { startsWith: 'stream-' } },
  });
  await prisma.ownerAccount.deleteMany({
    where: { contactEmail: { startsWith: 'owner-', endsWith: '@test.com' } },
  });
}

describe('EntitlementIpService', () => {
  let service: EntitlementIpService;
  let viewer: { id: string; email: string };
  let owner: { id: string };
  let stream: { id: string; slug: string };

  beforeEach(async () => {
    service = new EntitlementIpService(prisma);
    viewer = await createTestViewer();
    owner = await createTestOwner();
    stream = await createTestDirectStream(owner.id);
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.useRealTimers();
  });

  describe('IEntitlementIpChecker', () => {
    describe('validateAccess', () => {
      it('should allow first access and lock IP', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id);

        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(true);
        expect(result.ipLocked).toBe(true);
        expect(result.ipUpdated).toBe(true);
        expect(result.reason).toBeNull();
      });

      it('should allow subsequent access from same IP', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: new Date(),
        });

        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(true);
        expect(result.ipUpdated).toBe(false);
      });

      it('should deny access from different IP (outside grace period)', async () => {
        const oldTime = new Date(Date.now() - IP_LOCK_GRACE_PERIOD_MS - 60000);
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: oldTime,
          lastAccessedAt: oldTime,
        });

        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '10.0.0.1', // Different IP
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('ip_locked');
        expect(result.gracePeriodActive).toBe(false);
      });

      it('should allow IP change during grace period (WiFi → LTE switch)', async () => {
        const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: recentTime,
          lastAccessedAt: recentTime,
        });

        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '10.0.0.1', // Different IP, within grace
        });

        expect(result.allowed).toBe(true);
        expect(result.gracePeriodActive).toBe(true);
        expect(result.ipUpdated).toBe(true);
      });

      it('should deny access for unpaid purchase', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          status: 'created', // Not paid
        });

        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('not_paid');
      });

      it('should deny access for non-existent purchase', async () => {
        const result = await service.validateAccess({
          purchaseId: '00000000-0000-0000-0000-000000000000',
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('purchase_not_found');
      });

      it('should update lastAccessedAt on successful access', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: new Date(Date.now() - 60000),
        });

        const beforeAccess = Date.now();
        await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
        });

        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id },
        });
        expect(updated?.lastAccessedAt?.getTime()).toBeGreaterThanOrEqual(beforeAccess);
        expect(updated?.lastAccessedIp).toBe('192.168.1.100');
      });
    });

    describe('isWithinGracePeriod', () => {
      it('should return true when last access is recent', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: new Date(),
          lastAccessedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
        });

        const inGrace = await service.isWithinGracePeriod(purchase.id);

        expect(inGrace).toBe(true);
      });

      it('should return false when last access is old', async () => {
        const oldTime = new Date(Date.now() - IP_LOCK_GRACE_PERIOD_MS - 60000);
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.100',
          lockedAt: oldTime,
          lastAccessedAt: oldTime,
        });

        const inGrace = await service.isWithinGracePeriod(purchase.id);

        expect(inGrace).toBe(false);
      });

      it('should return true when no previous access (first lock)', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: null,
          lockedAt: null,
          lastAccessedAt: null,
        });

        const inGrace = await service.isWithinGracePeriod(purchase.id);

        expect(inGrace).toBe(true); // First access always allowed
      });
    });

    describe('getLockedIp', () => {
      it('should return null when not locked', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id);

        const ip = await service.getLockedIp(purchase.id);

        expect(ip).toBeNull();
      });

      it('should return IP when locked', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '10.20.30.40',
          lockedAt: new Date(),
        });

        const ip = await service.getLockedIp(purchase.id);

        expect(ip).toBe('10.20.30.40');
      });
    });

    describe('getIpLockStatus', () => {
      it('should return complete status object', async () => {
        const now = new Date();
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '192.168.1.1',
          lockedAt: now,
          lastAccessedAt: now,
          lastAccessedIp: '192.168.1.1',
        });

        const status = await service.getIpLockStatus(purchase.id);

        expect(status).not.toBeNull();
        expect(status?.purchaseId).toBe(purchase.id);
        expect(status?.lockedIpAddress).toBe('192.168.1.1');
        expect(status?.isWithinGracePeriod).toBe(true);
      });

      it('should return null for non-existent purchase', async () => {
        const status = await service.getIpLockStatus('00000000-0000-0000-0000-000000000000');

        expect(status).toBeNull();
      });
    });
  });

  describe('IEntitlementIpManager', () => {
    describe('lockToIp', () => {
      it('should set lockedIpAddress and lockedAt', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id);

        await service.lockToIp(purchase.id, '8.8.8.8');

        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id },
        });
        expect(updated?.lockedIpAddress).toBe('8.8.8.8');
        expect(updated?.lockedAt).toBeDefined();
      });
    });

    describe('updateLockedIp', () => {
      it('should update IP and reset lockedAt', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '1.1.1.1',
          lockedAt: new Date(Date.now() - 60000),
        });

        await service.updateLockedIp(purchase.id, '2.2.2.2');

        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id },
        });
        expect(updated?.lockedIpAddress).toBe('2.2.2.2');
      });
    });

    describe('recordAccess', () => {
      it('should update lastAccessedAt and lastAccessedIp', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id);
        const beforeAccess = Date.now();

        await service.recordAccess(purchase.id, '3.3.3.3');

        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id },
        });
        expect(updated?.lastAccessedIp).toBe('3.3.3.3');
        expect(updated?.lastAccessedAt?.getTime()).toBeGreaterThanOrEqual(beforeAccess);
      });
    });

    describe('clearIpLock', () => {
      it('should clear all IP lock fields', async () => {
        const purchase = await createTestPurchase(viewer.id, stream.id, {
          lockedIpAddress: '9.9.9.9',
          lockedAt: new Date(),
          lastAccessedAt: new Date(),
          lastAccessedIp: '9.9.9.9',
        });

        await service.clearIpLock(purchase.id);

        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id },
        });
        expect(updated?.lockedIpAddress).toBeNull();
        expect(updated?.lockedAt).toBeNull();
      });
    });
  });
});
