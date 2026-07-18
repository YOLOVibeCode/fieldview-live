/**
 * NotifyMeService Tests (TDD — RED phase)
 *
 * Tests the lightweight "notify me" signup flow.
 * All dependencies are mocked via ISP interfaces.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotifyMeService } from '../notify-me.service';
import type {
  INotifyMeViewerReader,
  INotifyMeStreamReader,
  INotifyMeRegistrationChecker,
  INotifyMeViewerWriter,
  INotifyMeRegistrationWriter,
  INotifyMeRegistrationUpdater,
} from '../notify-me.interfaces';
import type { ViewerIdentity, DirectStream, DirectStreamRegistration } from '@prisma/client';

describe('NotifyMeService (TDD)', () => {
  let service: NotifyMeService;
  let mockViewerReader: INotifyMeViewerReader;
  let mockStreamReader: INotifyMeStreamReader;
  let mockRegistrationChecker: INotifyMeRegistrationChecker;
  let mockViewerWriter: INotifyMeViewerWriter;
  let mockRegistrationWriter: INotifyMeRegistrationWriter;
  let mockRegistrationUpdater: INotifyMeRegistrationUpdater;

  const mockViewer: ViewerIdentity = {
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

  const mockStream: DirectStream = {
    id: 'stream-456',
    slug: 'tchs',
    title: 'Test Stream',
    ownerAccountId: 'owner-123',
    streamUrl: null,
    scheduledStartAt: new Date('2026-02-25T19:00:00Z'),
    reminderSentAt: null,
    sendReminders: true,
    reminderMinutes: 5,
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'hashed',
    chatEnabled: true,
    scoreboardEnabled: true,
    allowViewerScoreEdit: false,
    allowViewerNameEdit: false,
    allowAnonymousView: true,
    allowAnonymousChat: false,
    allowAnonymousScoreEdit: false,
    requireEmailVerification: false,
    listed: true,
    scoreboardHomeTeam: null,
    scoreboardAwayTeam: null,
    scoreboardHomeColor: null,
    scoreboardAwayColor: null,
    welcomeMessage: null,
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
    wantsReminders: true,
    lastSeenAt: null,
  };

  beforeEach(() => {
    mockViewerReader = {
      getByEmail: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue(null),
    };

    mockStreamReader = {
      getBySlug: vi.fn().mockResolvedValue(mockStream),
    };

    mockRegistrationChecker = {
      getExistingRegistration: vi.fn().mockResolvedValue(null),
    };

    mockViewerWriter = {
      createViewer: vi.fn().mockResolvedValue(mockViewer),
    };

    mockRegistrationWriter = {
      createRegistration: vi.fn().mockResolvedValue(mockRegistration),
    };

    mockRegistrationUpdater = {
      setWantsReminders: vi.fn().mockResolvedValue({ ...mockRegistration, wantsReminders: false }),
    };

    service = new NotifyMeService(
      mockViewerReader,
      mockStreamReader,
      mockRegistrationChecker,
      mockViewerWriter,
      mockRegistrationWriter,
      mockRegistrationUpdater,
    );
  });

  describe('subscribe', () => {
    it('should create new viewer and registration when email is new', async () => {
      vi.mocked(mockViewerReader.getByEmail).mockResolvedValue(null);

      const result = await service.subscribe({ email: 'new@example.com', slug: 'tchs' });

      expect(result.status).toBe('subscribed');
      expect(result.viewerId).toBe('viewer-123');
      expect(mockViewerWriter.createViewer).toHaveBeenCalledWith('new@example.com');
      expect(mockRegistrationWriter.createRegistration).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123',
      );
    });

    it('should reuse existing viewer and create new registration', async () => {
      vi.mocked(mockViewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);

      const result = await service.subscribe({ email: 'test@example.com', slug: 'tchs' });

      expect(result.status).toBe('subscribed');
      expect(result.viewerId).toBe('viewer-123');
      expect(mockViewerWriter.createViewer).not.toHaveBeenCalled();
      expect(mockRegistrationWriter.createRegistration).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123',
      );
    });

    it('should return already_subscribed when registration exists', async () => {
      vi.mocked(mockViewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(mockRegistration);

      const result = await service.subscribe({ email: 'test@example.com', slug: 'tchs' });

      expect(result.status).toBe('already_subscribed');
      expect(result.viewerId).toBe('viewer-123');
      expect(mockViewerWriter.createViewer).not.toHaveBeenCalled();
      expect(mockRegistrationWriter.createRegistration).not.toHaveBeenCalled();
    });

    it('should throw if stream not found by slug', async () => {
      vi.mocked(mockStreamReader.getBySlug).mockResolvedValue(null);

      await expect(
        service.subscribe({ email: 'test@example.com', slug: 'nonexistent' }),
      ).rejects.toThrow('Stream not found: nonexistent');
    });

    it('should trim and lowercase email', async () => {
      vi.mocked(mockViewerReader.getByEmail).mockResolvedValue(null);

      await service.subscribe({ email: '  Test@Example.COM  ', slug: 'tchs' });

      expect(mockViewerReader.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockViewerWriter.createViewer).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw if email is empty after trim', async () => {
      await expect(
        service.subscribe({ email: '   ', slug: 'tchs' }),
      ).rejects.toThrow();
    });
  });

  describe('subscribeById', () => {
    it('should subscribe when viewer exists and no registration', async () => {
      vi.mocked(mockViewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);

      const result = await service.subscribeById({
        slug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

      expect(result.status).toBe('subscribed');
      expect(result.viewerId).toBe('viewer-123');
      expect(mockViewerReader.getById).toHaveBeenCalledWith('viewer-123');
      expect(mockRegistrationWriter.createRegistration).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123',
      );
    });

    it('should return already_subscribed when registration exists', async () => {
      vi.mocked(mockViewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(mockRegistration);

      const result = await service.subscribeById({
        slug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

      expect(result.status).toBe('already_subscribed');
      expect(result.viewerId).toBe('viewer-123');
      expect(mockRegistrationWriter.createRegistration).not.toHaveBeenCalled();
    });

    it('should throw if stream not found', async () => {
      vi.mocked(mockStreamReader.getBySlug).mockResolvedValue(null);

      await expect(
        service.subscribeById({ slug: 'nonexistent', viewerIdentityId: 'viewer-123' }),
      ).rejects.toThrow('Stream not found: nonexistent');
    });

    it('should throw if viewer not found', async () => {
      vi.mocked(mockViewerReader.getById).mockResolvedValue(null);

      await expect(
        service.subscribeById({ slug: 'tchs', viewerIdentityId: 'bad-id' }),
      ).rejects.toThrow('Viewer not found');
    });

    it('should throw if viewerIdentityId is empty', async () => {
      await expect(
        service.subscribeById({ slug: 'tchs', viewerIdentityId: '' }),
      ).rejects.toThrow('Viewer identity id is required');
    });
  });

  describe('checkSubscription', () => {
    it('should return subscribed true when registration has wantsReminders', async () => {
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(mockRegistration);

      const result = await service.checkSubscription('tchs', 'viewer-123');

      expect(result.subscribed).toBe(true);
      expect(mockRegistrationChecker.getExistingRegistration).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123',
      );
    });

    it('should return subscribed false when no registration', async () => {
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue(null);

      const result = await service.checkSubscription('tchs', 'viewer-123');

      expect(result.subscribed).toBe(false);
    });

    it('should return subscribed false when registration has wantsReminders false', async () => {
      vi.mocked(mockRegistrationChecker.getExistingRegistration).mockResolvedValue({
        ...mockRegistration,
        wantsReminders: false,
      });

      const result = await service.checkSubscription('tchs', 'viewer-123');

      expect(result.subscribed).toBe(false);
    });

    it('should throw if stream not found', async () => {
      vi.mocked(mockStreamReader.getBySlug).mockResolvedValue(null);

      await expect(
        service.checkSubscription('nonexistent', 'viewer-123'),
      ).rejects.toThrow('Stream not found: nonexistent');
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribed when registration exists', async () => {
      vi.mocked(mockRegistrationUpdater.setWantsReminders).mockResolvedValue({
        ...mockRegistration,
        wantsReminders: false,
      });

      const result = await service.unsubscribe({
        slug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

      expect(result.status).toBe('unsubscribed');
      expect(mockRegistrationUpdater.setWantsReminders).toHaveBeenCalledWith(
        'stream-456',
        'viewer-123',
        false,
      );
    });

    it('should return not_found when no registration exists', async () => {
      vi.mocked(mockRegistrationUpdater.setWantsReminders).mockResolvedValue(null);

      const result = await service.unsubscribe({
        slug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

      expect(result.status).toBe('not_found');
    });

    it('should throw if stream not found', async () => {
      vi.mocked(mockStreamReader.getBySlug).mockResolvedValue(null);

      await expect(
        service.unsubscribe({ slug: 'nonexistent', viewerIdentityId: 'viewer-123' }),
      ).rejects.toThrow('Stream not found: nonexistent');
    });

    it('should throw if viewerIdentityId is empty', async () => {
      await expect(
        service.unsubscribe({ slug: 'tchs', viewerIdentityId: '' }),
      ).rejects.toThrow('Viewer identity id is required');
    });
  });
});
