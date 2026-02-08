/**
 * Auto-Registration Service Tests (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoRegistrationService } from '../auto-registration.service';
import type {
  IRegistrationChecker,
  IRegistrationCreator,
  IViewerIdentityReader,
  IDirectStreamReader,
} from '../auto-registration.interfaces';
import type { ViewerIdentity, DirectStreamRegistration, DirectStream } from '@prisma/client';

describe('AutoRegistrationService (TDD)', () => {
  let service: AutoRegistrationService;
  let mockRegistrationChecker: IRegistrationChecker;
  let mockRegistrationCreator: IRegistrationCreator;
  let mockViewerIdentityReader: IViewerIdentityReader;
  let mockDirectStreamReader: IDirectStreamReader;

  const mockViewer: ViewerIdentity = {
    id: 'viewer-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2026-01-01'),
    phoneE164: null,
    smsOptOut: false,
    optOutAt: null,
    lastSeenAt: null,
    wantsReminders: true,
    emailVerifiedAt: null,
  };

  const mockStream: DirectStream = {
    id: 'stream-456',
    slug: 'tchs',
    title: 'Test Stream',
    ownerAccountId: 'owner-123',
    streamUrl: null,
    scheduledStartAt: null,
    reminderSentAt: null,
    sendReminders: true,
    reminderMinutes: 15,
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'hashed-password',
    chatEnabled: true,
    scoreboardEnabled: true,
    allowViewerScoreEdit: false,
    allowViewerNameEdit: false,
    allowAnonymousView: true,
    allowAnonymousChat: false,
    allowAnonymousScoreEdit: false,
    requireEmailVerification: true,
    listed: true,
    scoreboardHomeTeam: null,
    scoreboardAwayTeam: null,
    scoreboardHomeColor: null,
    scoreboardAwayColor: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    status: 'active',
    archivedAt: null,
    deletedAt: null,
    autoPurgeAt: null,
    gameId: null,
  };

  const mockRegistration: DirectStreamRegistration = {
    id: 'reg-789',
    directStreamId: 'stream-456',
    viewerIdentityId: 'viewer-123',
    registeredAt: new Date('2026-01-15'),
    directStreamEventId: null,
    verifiedAt: null,
    wantsReminders: false,
    lastSeenAt: null,
  };

  beforeEach(() => {
    // Create mocks
    mockRegistrationChecker = {
      isViewerRegistered: vi.fn(),
      getExistingRegistration: vi.fn(),
    };

    mockRegistrationCreator = {
      createRegistration: vi.fn(),
    };

    mockViewerIdentityReader = {
      getById: vi.fn(),
    };

    mockDirectStreamReader = {
      getBySlug: vi.fn(),
    };

    // Create service with mocks (Dependency Injection)
    service = new AutoRegistrationService(
      mockRegistrationChecker,
      mockRegistrationCreator,
      mockViewerIdentityReader,
      mockDirectStreamReader
    );
  });

  describe('autoRegister', () => {
    it('should throw error if stream not found', async () => {
      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(null);

      await expect(
        service.autoRegister('nonexistent', 'viewer-123')
      ).rejects.toThrow('Stream not found: nonexistent');
    });

    it('should throw error if viewer not found', async () => {
      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(mockStream);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(null);

      await expect(
        service.autoRegister('tchs', 'nonexistent')
      ).rejects.toThrow('Viewer identity not found: nonexistent');
    });

    it('should return existing registration if already registered', async () => {
      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(mockStream);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(mockRegistration);

      const result = await service.autoRegister('tchs', 'viewer-123');

      expect(result.isNewRegistration).toBe(false);
      expect(result.registration.id).toBe('reg-789');
      expect(result.registration.viewerIdentity.email).toBe('test@example.com');
      expect(mockRegistrationCreator.createRegistration).not.toHaveBeenCalled();
    });

    it('should create new registration if not already registered', async () => {
      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(mockStream);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);
      vi.mocked(mockRegistrationCreator.createRegistration).mockResolvedValue(mockRegistration);

      const result = await service.autoRegister('tchs', 'viewer-123');

      expect(result.isNewRegistration).toBe(true);
      expect(result.registration.id).toBe('reg-789');
      expect(result.registration.viewerIdentity.email).toBe('test@example.com');
      expect(mockRegistrationCreator.createRegistration).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123'
      );
    });

    it('should attach viewer identity to registration', async () => {
      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(mockStream);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);
      vi.mocked(mockRegistrationCreator.createRegistration).mockResolvedValue(mockRegistration);

      const result = await service.autoRegister('tchs', 'viewer-123');

      expect(result.registration.viewerIdentity).toEqual({
        id: 'viewer-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: expect.any(Date),
      });
    });

    it('should handle viewer with no firstName/lastName', async () => {
      const minimalViewer: ViewerIdentity = {
        id: 'viewer-123',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        createdAt: new Date('2026-01-01'),
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      vi.mocked(mockDirectStreamReader.getBySlug).mockResolvedValue(mockStream);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(minimalViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);
      vi.mocked(mockRegistrationCreator.createRegistration).mockResolvedValue(mockRegistration);

      const result = await service.autoRegister('tchs', 'viewer-123');

      expect(result.registration.viewerIdentity.firstName).toBeNull();
      expect(result.registration.viewerIdentity.lastName).toBeNull();
    });
  });
});

