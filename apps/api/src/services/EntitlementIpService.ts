/**
 * EntitlementIpService Implementation
 *
 * Manages IP-locked stream access for purchases.
 * One purchase = one household (same IP can watch multiple times).
 */

import type { PrismaClient } from '@prisma/client';

import {
  IP_LOCK_GRACE_PERIOD_MS,
  type AccessCheckInput,
  type AccessCheckResult,
  type AccessDeniedReason,
  type IEntitlementIpService,
  type IpLockStatus,
} from './IEntitlementIpService';

export class EntitlementIpService implements IEntitlementIpService {
  constructor(private readonly prisma: PrismaClient) {}

  // =========================================
  // IEntitlementIpChecker Implementation
  // =========================================

  async validateAccess(input: AccessCheckInput): Promise<AccessCheckResult> {
    const { purchaseId, ipAddress } = input;

    // Find purchase
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        status: true,
        lockedIpAddress: true,
        lockedAt: true,
        lastAccessedAt: true,
        directStream: {
          select: { streamUrl: true },
        },
      },
    });

    // Purchase not found
    if (!purchase) {
      return this.denied('purchase_not_found');
    }

    // Not paid
    if (purchase.status !== 'paid') {
      return this.denied('not_paid');
    }

    // First access - lock to this IP
    if (!purchase.lockedIpAddress) {
      await this.lockToIp(purchaseId, ipAddress);
      await this.recordAccess(purchaseId, ipAddress);

      return {
        allowed: true,
        reason: null,
        ipLocked: true,
        ipUpdated: true,
        gracePeriodActive: false,
        streamUrl: purchase.directStream?.streamUrl ?? undefined,
      };
    }

    // Same IP - allow
    if (purchase.lockedIpAddress === ipAddress) {
      await this.recordAccess(purchaseId, ipAddress);

      return {
        allowed: true,
        reason: null,
        ipLocked: true,
        ipUpdated: false,
        gracePeriodActive: false,
        streamUrl: purchase.directStream?.streamUrl ?? undefined,
      };
    }

    // Different IP - check grace period
    const inGrace = this.isWithinGracePeriodFromTimestamp(purchase.lastAccessedAt);

    if (inGrace) {
      // Allow IP change during grace period (WiFi → LTE)
      await this.updateLockedIp(purchaseId, ipAddress);
      await this.recordAccess(purchaseId, ipAddress);

      return {
        allowed: true,
        reason: null,
        ipLocked: true,
        ipUpdated: true,
        gracePeriodActive: true,
        streamUrl: purchase.directStream?.streamUrl ?? undefined,
      };
    }

    // Outside grace period - deny
    return {
      allowed: false,
      reason: 'ip_locked' as AccessDeniedReason,
      ipLocked: true,
      ipUpdated: false,
      gracePeriodActive: false,
    };
  }

  async isWithinGracePeriod(purchaseId: string): Promise<boolean> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { lastAccessedAt: true, lockedAt: true },
    });

    if (!purchase) {
      return false;
    }

    // First access - always allowed
    if (!purchase.lockedAt) {
      return true;
    }

    return this.isWithinGracePeriodFromTimestamp(purchase.lastAccessedAt);
  }

  async getLockedIp(purchaseId: string): Promise<string | null> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { lockedIpAddress: true },
    });

    return purchase?.lockedIpAddress ?? null;
  }

  async getIpLockStatus(purchaseId: string): Promise<IpLockStatus | null> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        lockedIpAddress: true,
        lockedAt: true,
        lastAccessedAt: true,
        lastAccessedIp: true,
      },
    });

    if (!purchase) {
      return null;
    }

    return {
      purchaseId: purchase.id,
      lockedIpAddress: purchase.lockedIpAddress,
      lockedAt: purchase.lockedAt,
      lastAccessedAt: purchase.lastAccessedAt,
      lastAccessedIp: purchase.lastAccessedIp,
      isWithinGracePeriod: this.isWithinGracePeriodFromTimestamp(purchase.lastAccessedAt),
    };
  }

  // =========================================
  // IEntitlementIpManager Implementation
  // =========================================

  async lockToIp(purchaseId: string, ipAddress: string): Promise<void> {
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        lockedIpAddress: ipAddress,
        lockedAt: new Date(),
      },
    });
  }

  async updateLockedIp(purchaseId: string, newIpAddress: string): Promise<void> {
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        lockedIpAddress: newIpAddress,
        lockedAt: new Date(),
      },
    });
  }

  async recordAccess(purchaseId: string, ipAddress: string): Promise<void> {
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        lastAccessedAt: new Date(),
        lastAccessedIp: ipAddress,
      },
    });
  }

  async clearIpLock(purchaseId: string): Promise<void> {
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        lockedIpAddress: null,
        lockedAt: null,
      },
    });
  }

  // =========================================
  // Private Helpers
  // =========================================

  private denied(reason: AccessDeniedReason): AccessCheckResult {
    return {
      allowed: false,
      reason,
      ipLocked: false,
      ipUpdated: false,
      gracePeriodActive: false,
    };
  }

  private isWithinGracePeriodFromTimestamp(lastAccess: Date | null): boolean {
    if (!lastAccess) {
      return true; // First access
    }

    const elapsed = Date.now() - lastAccess.getTime();
    return elapsed < IP_LOCK_GRACE_PERIOD_MS;
  }
}
