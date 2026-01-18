/**
 * AbuseDetectionService Implementation
 *
 * Detects multi-account abuse via device fingerprinting.
 * Implements compassionate handling with one-time pass system.
 */

import type { PrismaClient } from '@prisma/client';

import {
  maskEmail,
  type AbuseMessage,
  type IAbuseDetectionService,
  type LinkedAccount,
  type RecordFingerprintInput,
  type RegistrationCheckInput,
  type RegistrationCheckResult,
} from './IAbuseDetectionService';

export class AbuseDetectionService implements IAbuseDetectionService {
  constructor(private readonly prisma: PrismaClient) {}

  // =========================================
  // IAbuseDetector Implementation
  // =========================================

  async checkRegistration(input: RegistrationCheckInput): Promise<RegistrationCheckResult> {
    const { fingerprintHash } = input;

    // Check if fingerprint exists
    const fingerprint = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        ownerAccounts: {
          include: {
            ownerAccount: {
              select: { id: true, contactEmail: true },
            },
          },
        },
      },
    });

    // New fingerprint - allow registration
    if (!fingerprint) {
      return {
        allowed: true,
        linkedAccountCount: 0,
        abuseDetected: false,
        oneTimePassAvailable: false,
        message: 'none',
      };
    }

    const linkedCount = fingerprint.ownerAccounts.length;

    // No linked accounts - allow
    if (linkedCount === 0) {
      return {
        allowed: true,
        linkedAccountCount: 0,
        abuseDetected: false,
        oneTimePassAvailable: false,
        message: 'none',
      };
    }

    // One linked account - warn but allow
    if (linkedCount === 1) {
      return {
        allowed: true,
        linkedAccountCount: 1,
        abuseDetected: false,
        oneTimePassAvailable: false,
        message: 'first_warning',
      };
    }

    // 2+ linked accounts - abuse detected
    const abuseDetected = true;
    const oneTimePassAvailable = !fingerprint.oneTimePassUsed;

    // Determine message based on pass status
    let message: AbuseMessage;
    if (fingerprint.oneTimePassUsed) {
      message = 'final_block';
    } else {
      message = 'abuse_detected';
    }

    return {
      allowed: false,
      linkedAccountCount: linkedCount,
      abuseDetected,
      oneTimePassAvailable,
      message,
    };
  }

  async getLinkedAccounts(fingerprintHash: string): Promise<LinkedAccount[]> {
    const fingerprint = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        ownerAccounts: {
          include: {
            ownerAccount: {
              select: { id: true, contactEmail: true },
            },
          },
          orderBy: {
            registeredAt: 'desc',
          },
        },
      },
    });

    if (!fingerprint) {
      return [];
    }

    return fingerprint.ownerAccounts.map((link) => ({
      ownerAccountId: link.ownerAccount.id,
      email: maskEmail(link.ownerAccount.contactEmail),
      registeredAt: link.registeredAt,
    }));
  }

  async hasUsedOneTimePass(fingerprintHash: string): Promise<boolean> {
    const fingerprint = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      select: { oneTimePassUsed: true },
    });

    return fingerprint?.oneTimePassUsed ?? false;
  }

  async getFingerprintByHash(
    fingerprintHash: string
  ): Promise<{ id: string; oneTimePassUsed: boolean; warningsShown: number } | null> {
    const fingerprint = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      select: {
        id: true,
        oneTimePassUsed: true,
        warningsShown: true,
      },
    });

    return fingerprint;
  }

  // =========================================
  // IAbuseRecorder Implementation
  // =========================================

  async recordFingerprint(input: RecordFingerprintInput): Promise<void> {
    const { ownerAccountId, fingerprintHash, ipAddress } = input;

    // Upsert fingerprint (create if not exists)
    const fingerprint = await this.prisma.deviceFingerprint.upsert({
      where: { fingerprintHash },
      create: {
        fingerprintHash,
        ipAddresses: [ipAddress],
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
        // Add IP if not already in list
        ipAddresses: {
          push: ipAddress,
        },
      },
    });

    // Link owner to fingerprint (skip if already linked)
    await this.prisma.ownerAccountFingerprint.upsert({
      where: {
        ownerAccountId_deviceFingerprintId: {
          ownerAccountId,
          deviceFingerprintId: fingerprint.id,
        },
      },
      create: {
        ownerAccountId,
        deviceFingerprintId: fingerprint.id,
        registrationIp: ipAddress,
      },
      update: {
        // No update needed, just prevent error
      },
    });

    // Deduplicate IP addresses
    const uniqueIps = [...new Set(fingerprint.ipAddresses)];
    if (!uniqueIps.includes(ipAddress)) {
      uniqueIps.push(ipAddress);
    }

    await this.prisma.deviceFingerprint.update({
      where: { id: fingerprint.id },
      data: { ipAddresses: uniqueIps },
    });
  }

  async useOneTimePass(fingerprintHash: string): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: { oneTimePassUsed: true },
    });
  }

  async incrementWarnings(fingerprintHash: string): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        warningsShown: {
          increment: 1,
        },
      },
    });
  }

  async flagForAbuse(fingerprintHash: string, reason: string): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        flaggedAt: new Date(),
        flagReason: reason,
        abuseScore: 100, // Max score
      },
    });
  }

  async updateLastSeen(fingerprintHash: string): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: { lastSeenAt: new Date() },
    });
  }

  async addIpAddress(fingerprintHash: string, ipAddress: string): Promise<void> {
    const fingerprint = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      select: { ipAddresses: true },
    });

    if (!fingerprint) return;

    const uniqueIps = [...new Set([...fingerprint.ipAddresses, ipAddress])];

    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: { ipAddresses: uniqueIps },
    });
  }
}
