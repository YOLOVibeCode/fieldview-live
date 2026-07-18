/**
 * AbuseDetectionService TDD Tests
 *
 * Tests written BEFORE implementation (TDD approach).
 * Tests IAbuseDetector and IAbuseRecorder interfaces.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { PrismaClient } from '@prisma/client';

import { AbuseDetectionService } from '../../src/services/AbuseDetectionService';
import { maskEmail } from '../../src/services/IAbuseDetectionService';

const prisma = new PrismaClient();

// Test helpers
function generateTestFingerprint(): string {
  return `test-fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createTestOwner(email?: string): Promise<{ id: string; contactEmail: string }> {
  const ownerEmail = email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const owner = await prisma.ownerAccount.create({
    data: {
      type: 'owner',
      name: 'Test Owner',
      status: 'active',
      contactEmail: ownerEmail,
    },
  });

  return { id: owner.id, contactEmail: owner.contactEmail };
}

async function createTestFingerprint(
  hash: string,
  overrides: { oneTimePassUsed?: boolean; warningsShown?: number } = {}
): Promise<{ id: string; fingerprintHash: string }> {
  const fp = await prisma.deviceFingerprint.create({
    data: {
      fingerprintHash: hash,
      ipAddresses: [],
      oneTimePassUsed: overrides.oneTimePassUsed ?? false,
      warningsShown: overrides.warningsShown ?? 0,
    },
  });

  return { id: fp.id, fingerprintHash: fp.fingerprintHash };
}

async function linkOwnerToFingerprint(
  ownerAccountId: string,
  deviceFingerprintId: string,
  registrationIp: string
): Promise<void> {
  await prisma.ownerAccountFingerprint.create({
    data: {
      ownerAccountId,
      deviceFingerprintId,
      registrationIp,
    },
  });
}

async function cleanupTestData(): Promise<void> {
  // Clean in order due to foreign keys
  await prisma.ownerAccountFingerprint.deleteMany({});
  await prisma.deviceFingerprint.deleteMany({
    where: {
      fingerprintHash: { startsWith: 'test-fp-' },
    },
  });
  await prisma.ownerAccount.deleteMany({
    where: {
      contactEmail: { contains: 'test-', endsWith: '@example.com' },
    },
  });
}

describe('AbuseDetectionService', () => {
  let service: AbuseDetectionService;

  beforeEach(() => {
    service = new AbuseDetectionService(prisma);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('IAbuseDetector', () => {
    describe('checkRegistration', () => {
      it('should allow first registration from new fingerprint', async () => {
        const fingerprint = generateTestFingerprint();

        const result = await service.checkRegistration({
          fingerprintHash: fingerprint,
          ipAddress: '192.168.1.1',
          email: 'coach@example.com',
        });

        expect(result.allowed).toBe(true);
        expect(result.linkedAccountCount).toBe(0);
        expect(result.abuseDetected).toBe(false);
        expect(result.message).toBe('none');
      });

      it('should warn (first_warning) on second registration from same fingerprint', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash);
        const existingOwner = await createTestOwner('first@example.com');
        await linkOwnerToFingerprint(existingOwner.id, fingerprint.id, '1.1.1.1');

        const result = await service.checkRegistration({
          fingerprintHash: fpHash,
          ipAddress: '2.2.2.2',
          email: 'second@example.com',
        });

        expect(result.allowed).toBe(true); // Allow with warning
        expect(result.linkedAccountCount).toBe(1);
        expect(result.abuseDetected).toBe(false);
        expect(result.message).toBe('first_warning');
      });

      it('should detect abuse on third registration (2+ existing accounts)', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash);

        const owner1 = await createTestOwner('a@test.com');
        const owner2 = await createTestOwner('b@test.com');
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');

        const result = await service.checkRegistration({
          fingerprintHash: fpHash,
          ipAddress: '3.3.3.3',
          email: 'c@test.com',
        });

        expect(result.allowed).toBe(false);
        expect(result.linkedAccountCount).toBe(2);
        expect(result.abuseDetected).toBe(true);
        expect(result.oneTimePassAvailable).toBe(true);
        expect(result.message).toBe('abuse_detected');
      });

      it('should offer one-time pass when abuse detected (pass not used)', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash, { oneTimePassUsed: false });

        const owner1 = await createTestOwner('a@test.com');
        const owner2 = await createTestOwner('b@test.com');
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');

        const result = await service.checkRegistration({
          fingerprintHash: fpHash,
          ipAddress: '3.3.3.3',
          email: 'c@test.com',
        });

        expect(result.abuseDetected).toBe(true);
        expect(result.oneTimePassAvailable).toBe(true);
      });

      it('should hard block (final_block) after one-time pass used', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash, { oneTimePassUsed: true });

        const owner1 = await createTestOwner('a@test.com');
        const owner2 = await createTestOwner('b@test.com');
        const owner3 = await createTestOwner('c@test.com'); // Pass account
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');
        await linkOwnerToFingerprint(owner3.id, fingerprint.id, '3.3.3.3');

        const result = await service.checkRegistration({
          fingerprintHash: fpHash,
          ipAddress: '4.4.4.4',
          email: 'd@test.com',
        });

        expect(result.allowed).toBe(false);
        expect(result.oneTimePassAvailable).toBe(false);
        expect(result.message).toBe('final_block');
      });

      it('should detect abuse across different IPs with same fingerprint', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash);

        const owner1 = await createTestOwner('a@test.com');
        const owner2 = await createTestOwner('b@test.com');
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');

        const result = await service.checkRegistration({
          fingerprintHash: fpHash,
          ipAddress: '3.3.3.3', // Yet another IP
          email: 'c@test.com',
        });

        expect(result.abuseDetected).toBe(true);
      });
    });

    describe('getLinkedAccounts', () => {
      it('should return empty array for new fingerprint', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash);

        const linked = await service.getLinkedAccounts(fpHash);

        expect(linked).toHaveLength(0);
      });

      it('should return all accounts linked to fingerprint', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash);

        const owner1 = await createTestOwner('user1@example.com');
        const owner2 = await createTestOwner('user2@example.com');
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');

        const linked = await service.getLinkedAccounts(fpHash);

        expect(linked).toHaveLength(2);
      });

      it('should mask email addresses for privacy', async () => {
        const fpHash = generateTestFingerprint();
        const fingerprint = await createTestFingerprint(fpHash);
        const owner = await createTestOwner('john.doe@example.com');
        await linkOwnerToFingerprint(owner.id, fingerprint.id, '1.1.1.1');

        const linked = await service.getLinkedAccounts(fpHash);

        expect(linked[0].email).toMatch(/j\*\*\*@example\.com/);
      });
    });

    describe('hasUsedOneTimePass', () => {
      it('should return false for new fingerprint', async () => {
        const fpHash = generateTestFingerprint();

        const used = await service.hasUsedOneTimePass(fpHash);

        expect(used).toBe(false);
      });

      it('should return false when pass not used', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash, { oneTimePassUsed: false });

        const used = await service.hasUsedOneTimePass(fpHash);

        expect(used).toBe(false);
      });

      it('should return true when pass used', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash, { oneTimePassUsed: true });

        const used = await service.hasUsedOneTimePass(fpHash);

        expect(used).toBe(true);
      });
    });
  });

  describe('IAbuseRecorder', () => {
    describe('recordFingerprint', () => {
      it('should create fingerprint if not exists', async () => {
        const fpHash = generateTestFingerprint();
        const owner = await createTestOwner();

        await service.recordFingerprint({
          ownerAccountId: owner.id,
          fingerprintHash: fpHash,
          ipAddress: '192.168.1.1',
        });

        const fp = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: fpHash },
        });
        expect(fp).toBeDefined();
      });

      it('should link owner to existing fingerprint', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash);
        const owner = await createTestOwner();

        await service.recordFingerprint({
          ownerAccountId: owner.id,
          fingerprintHash: fpHash,
          ipAddress: '192.168.1.1',
        });

        const link = await prisma.ownerAccountFingerprint.findFirst({
          where: { ownerAccountId: owner.id },
        });
        expect(link).toBeDefined();
      });

      it('should add IP to fingerprint IP list', async () => {
        const fpHash = generateTestFingerprint();
        const owner = await createTestOwner();

        await service.recordFingerprint({
          ownerAccountId: owner.id,
          fingerprintHash: fpHash,
          ipAddress: '192.168.1.100',
        });

        const fp = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: fpHash },
        });
        expect(fp?.ipAddresses).toContain('192.168.1.100');
      });
    });

    describe('useOneTimePass', () => {
      it('should mark one-time pass as used', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash, { oneTimePassUsed: false });

        await service.useOneTimePass(fpHash);

        const fp = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: fpHash },
        });
        expect(fp?.oneTimePassUsed).toBe(true);
      });
    });

    describe('incrementWarnings', () => {
      it('should increment warning counter', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash, { warningsShown: 1 });

        await service.incrementWarnings(fpHash);

        const fp = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: fpHash },
        });
        expect(fp?.warningsShown).toBe(2);
      });
    });

    describe('flagForAbuse', () => {
      it('should set flaggedAt and reason', async () => {
        const fpHash = generateTestFingerprint();
        await createTestFingerprint(fpHash);

        await service.flagForAbuse(fpHash, 'Multiple account abuse');

        const fp = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: fpHash },
        });
        expect(fp?.flaggedAt).toBeDefined();
        expect(fp?.flagReason).toBe('Multiple account abuse');
      });
    });
  });
});

describe('maskEmail helper', () => {
  it('should mask email correctly', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('a@test.com')).toBe('a***@test.com');
    expect(maskEmail('longname@domain.org')).toBe('l***@domain.org');
  });

  it('should handle invalid emails', () => {
    expect(maskEmail('invalid')).toBe('***@***');
    expect(maskEmail('')).toBe('***@***');
  });
});
