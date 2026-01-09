/**
 * RegistrationService Unit Tests (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegistrationService } from '../../../src/services/RegistrationService';
import type { IDirectStreamRegistrationReader, IDirectStreamRegistrationWriter } from '../../../src/repositories/IDirectStreamRegistrationRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../../../src/repositories/IViewerIdentityRepository';
import type { IEmailVerificationService } from '../../../src/services/IEmailVerificationService';
import type { ViewerIdentity, DirectStreamRegistration } from '@prisma/client';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let registrationReader: IDirectStreamRegistrationReader;
  let registrationWriter: IDirectStreamRegistrationWriter;
  let viewerReader: IViewerIdentityReader;
  let viewerWriter: IViewerIdentityWriter;
  let verificationService: IEmailVerificationService;

  beforeEach(() => {
    registrationReader = {
      findByStreamAndViewer: vi.fn(),
      findByStream: vi.fn(),
      countByStream: vi.fn(),
      findVerifiedByStream: vi.fn(),
    };

    registrationWriter = {
      create: vi.fn(),
      updateVerifiedAt: vi.fn(),
      updateLastSeenAt: vi.fn(),
    };

    viewerReader = {
      getById: vi.fn(),
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
      getByEmailVerified: vi.fn(),
    };

    viewerWriter = {
      create: vi.fn(),
      update: vi.fn(),
      markEmailVerified: vi.fn(),
    };

    verificationService = {
      issueToken: vi.fn().mockResolvedValue({
        token: 'mock-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
      verifyToken: vi.fn(),
      sendVerificationEmail: vi.fn(),
    };

    service = new RegistrationService(
      registrationReader,
      registrationWriter,
      viewerReader,
      viewerWriter,
      verificationService
    );
  });

  describe('registerForStream', () => {
    it('should create ViewerIdentity if new email', async () => {
      vi.mocked(viewerReader.getByEmail).mockResolvedValue(null);
      vi.mocked(viewerWriter.create).mockResolvedValue({
        id: 'viewer-new',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      });
      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(null);
      vi.mocked(registrationWriter.create).mockResolvedValue({
        id: 'reg-1',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-new',
        registeredAt: new Date(),
        verifiedAt: null,
        wantsReminders: false,
        lastSeenAt: null,
      });

      const result = await service.registerForStream('stream-1', {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        wantsReminders: false,
      });

      expect(result.status).toBe('verification_required');
      expect(viewerWriter.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });
    });

    it('should upsert DirectStreamRegistration', async () => {
      const mockViewer: ViewerIdentity = {
        id: 'viewer-existing',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      vi.mocked(viewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(null);
      vi.mocked(registrationWriter.create).mockResolvedValue({
        id: 'reg-1',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-existing',
        registeredAt: new Date(),
        verifiedAt: null,
        wantsReminders: false,
        lastSeenAt: null,
      });

      await service.registerForStream('stream-1', {
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        wantsReminders: false,
      });

      expect(registrationWriter.create).toHaveBeenCalledWith({
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-existing',
        wantsReminders: false,
      });
    });

    it('should issue verification token', async () => {
      const mockViewer: ViewerIdentity = {
        id: 'viewer-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      vi.mocked(viewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(null);
      vi.mocked(registrationWriter.create).mockResolvedValue({
        id: 'reg-1',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-1',
        registeredAt: new Date(),
        verifiedAt: null,
        wantsReminders: false,
        lastSeenAt: null,
      });

      await service.registerForStream('stream-1', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        wantsReminders: false,
      });

      expect(verificationService.issueToken).toHaveBeenCalledWith('viewer-1', 'stream-1');
    });

    it('should send verification email', async () => {
      const mockViewer: ViewerIdentity = {
        id: 'viewer-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      vi.mocked(viewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(null);
      vi.mocked(registrationWriter.create).mockResolvedValue({
        id: 'reg-1',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-1',
        registeredAt: new Date(),
        verifiedAt: null,
        wantsReminders: false,
        lastSeenAt: null,
      });

      await service.registerForStream('stream-1', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        wantsReminders: false,
      });

      expect(verificationService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should be idempotent (duplicate calls)', async () => {
      const mockViewer: ViewerIdentity = {
        id: 'viewer-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      const existingReg: DirectStreamRegistration = {
        id: 'reg-existing',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-1',
        registeredAt: new Date(),
        verifiedAt: null,
        wantsReminders: false,
        lastSeenAt: null,
      };

      vi.mocked(viewerReader.getByEmail).mockResolvedValue(mockViewer);
      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(existingReg);

      const result = await service.registerForStream('stream-1', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        wantsReminders: false,
      });

      expect(result.status).toBe('verification_required');
      expect(registrationWriter.create).not.toHaveBeenCalled(); // Idempotent - no duplicate
      expect(verificationService.issueToken).toHaveBeenCalled(); // But still resend verification
    });
  });

  describe('resendVerification', () => {
    it('should invalidate old tokens and resend', async () => {
      const mockViewer: ViewerIdentity = {
        id: 'viewer-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
        wantsReminders: true,
        emailVerifiedAt: null,
      };

      vi.mocked(viewerReader.getByEmail).mockResolvedValue(mockViewer);

      await service.resendVerification('stream-1', 'test@example.com');

      expect(verificationService.issueToken).toHaveBeenCalledWith('viewer-1', 'stream-1');
      expect(verificationService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('getRegistrationsByStream', () => {
    it('should return registration summaries', async () => {
      const mockRegistrations: any[] = [
        {
          id: 'reg-1',
          directStreamId: 'stream-1',
          viewerIdentityId: 'viewer-1',
          registeredAt: new Date(),
          verifiedAt: new Date(),
          wantsReminders: true,
          lastSeenAt: new Date(),
          viewerIdentity: {
            id: 'viewer-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];

      vi.mocked(registrationReader.findByStream).mockResolvedValue(mockRegistrations);

      const result = await service.getRegistrationsByStream('stream-1');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('test@example.com');
      expect(result[0].isVerified).toBe(true);
    });
  });
});

