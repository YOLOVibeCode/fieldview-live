import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntitlementService } from '@/services/EntitlementService';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { IEntitlementReader as IEntitlementRepoReader } from '@/repositories/IEntitlementRepository';
import type { IPlaybackSessionWriter } from '@/repositories/IPlaybackSessionRepository';
import type { Entitlement, PlaybackSession } from '@prisma/client';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let mockEntitlementRepo: IEntitlementRepoReader;
  let mockPlaybackSessionWriter: IPlaybackSessionWriter;

  beforeEach(() => {
    mockEntitlementRepo = {
      getById: vi.fn(),
      getByPurchaseId: vi.fn(),
      getByTokenId: vi.fn(),
    };
    mockPlaybackSessionWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new EntitlementService(mockEntitlementRepo, mockPlaybackSessionWriter);
  });

  describe('validateToken', () => {
    it('returns valid for active, non-expired token', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000), // 1 hour from now
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getByTokenId).mockResolvedValue(entitlement);

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(true);
      expect(result.entitlement).toEqual(entitlement);
    });

    it('returns invalid for non-existent token', async () => {
      vi.mocked(mockEntitlementRepo.getByTokenId).mockResolvedValue(null);

      const result = await service.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('returns invalid for expired token', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 2000),
        validTo: new Date(Date.now() - 1000), // Expired
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getByTokenId).mockResolvedValue(entitlement);

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('returns invalid for not-yet-valid token', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() + 1000), // Future
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getByTokenId).mockResolvedValue(entitlement);

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is not yet valid');
    });

    it('returns invalid for inactive entitlement', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'expired',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getByTokenId).mockResolvedValue(entitlement);

      const result = await service.validateToken('token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Entitlement is not active');
    });
  });

  describe('createPlaybackSession', () => {
    it('creates playback session for valid entitlement', async () => {
      const entitlement = {
        id: 'entitlement-1',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockEntitlementRepo.getById).mockResolvedValue(entitlement);
      vi.mocked(mockPlaybackSessionWriter.create).mockResolvedValue(session);

      const result = await service.createPlaybackSession('entitlement-1');

      expect(result).toEqual(session);
      expect(mockPlaybackSessionWriter.create).toHaveBeenCalledWith({
        entitlementId: 'entitlement-1',
        startedAt: expect.any(Date),
      });
    });

    it('throws NotFoundError if entitlement not found', async () => {
      vi.mocked(mockEntitlementRepo.getById).mockResolvedValue(null);

      await expect(service.createPlaybackSession('invalid-entitlement')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if entitlement not active', async () => {
      const entitlement = {
        id: 'entitlement-1',
        status: 'expired',
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getById).mockResolvedValue(entitlement);

      await expect(service.createPlaybackSession('entitlement-1')).rejects.toThrow(ForbiddenError);
    });

    it('throws UnauthorizedError if entitlement expired', async () => {
      const entitlement = {
        id: 'entitlement-1',
        status: 'active',
        validFrom: new Date(Date.now() - 2000),
        validTo: new Date(Date.now() - 1000), // Expired
      } as Entitlement;

      vi.mocked(mockEntitlementRepo.getById).mockResolvedValue(entitlement);

      await expect(service.createPlaybackSession('entitlement-1')).rejects.toThrow(UnauthorizedError);
    });
  });
});
