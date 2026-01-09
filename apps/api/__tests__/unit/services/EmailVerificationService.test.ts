/**
 * EmailVerificationService Unit Tests (TDD)
 * 
 * Test-first approach following TDD principles.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailVerificationService } from '../../../src/services/EmailVerificationService';
import type { IEmailVerificationReader, IEmailVerificationWriter } from '../../../src/repositories/IEmailVerificationRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../../../src/repositories/IViewerIdentityRepository';
import type { IEmailProvider } from '../../../src/services/IEmailProvider';
import type { EmailVerificationToken, ViewerIdentity } from '@prisma/client';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let tokenReader: IEmailVerificationReader;
  let tokenWriter: IEmailVerificationWriter;
  let viewerReader: IViewerIdentityReader;
  let viewerWriter: IViewerIdentityWriter;
  let emailProvider: IEmailProvider;

  beforeEach(() => {
    // Mock repositories
    tokenReader = {
      findValidToken: vi.fn(),
      findActiveTokensForViewer: vi.fn(),
    };

    tokenWriter = {
      createToken: vi.fn(),
      markTokenUsed: vi.fn(),
      invalidateTokens: vi.fn(),
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

    emailProvider = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };

    service = new EmailVerificationService(
      tokenReader,
      tokenWriter,
      viewerReader,
      viewerWriter,
      emailProvider
    );
  });

  describe('issueToken', () => {
    it('should generate unique token hash', async () => {
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

      const mockToken: EmailVerificationToken = {
        id: 'token-1',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'abc123hash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(viewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(tokenWriter.invalidateTokens).mockResolvedValue(0);
      vi.mocked(tokenWriter.createToken).mockResolvedValue(mockToken);

      const result = await service.issueToken('viewer-1', 'stream-1');

      expect(result.token).toBeTruthy();
      expect(result.token.length).toBeGreaterThan(20);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(tokenWriter.createToken).toHaveBeenCalled();
    });

    it('should set expiry to 24 hours from now', async () => {
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

      vi.mocked(viewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(tokenWriter.invalidateTokens).mockResolvedValue(0);
      vi.mocked(tokenWriter.createToken).mockImplementation(async (data) => ({
        id: 'token-1',
        viewerIdentityId: data.viewerIdentityId,
        directStreamId: data.directStreamId || null,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
        createdAt: new Date(),
      }));

      const now = Date.now();
      const result = await service.issueToken('viewer-1', 'stream-1');

      const expiryHours = (result.expiresAt.getTime() - now) / (1000 * 60 * 60);
      expect(expiryHours).toBeGreaterThanOrEqual(23.9);
      expect(expiryHours).toBeLessThanOrEqual(24.1);
    });

    it('should invalidate existing active tokens', async () => {
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

      vi.mocked(viewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(tokenWriter.invalidateTokens).mockResolvedValue(2); // 2 old tokens deleted
      vi.mocked(tokenWriter.createToken).mockResolvedValue({
        id: 'token-1',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'newhash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      });

      await service.issueToken('viewer-1', 'stream-1');

      expect(tokenWriter.invalidateTokens).toHaveBeenCalledWith('viewer-1', 'stream-1');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and mark ViewerIdentity as verified', async () => {
      const mockToken: EmailVerificationToken = {
        id: 'token-1',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'validhash',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        usedAt: null,
        createdAt: new Date(),
      };

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

      vi.mocked(tokenReader.findValidToken).mockResolvedValue(mockToken);
      vi.mocked(viewerWriter.markEmailVerified).mockResolvedValue({
        ...mockViewer,
        emailVerifiedAt: new Date(),
      });
      vi.mocked(tokenWriter.markTokenUsed).mockResolvedValue({
        ...mockToken,
        usedAt: new Date(),
      });

      const result = await service.verifyToken('raw-token-string');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.viewerId).toBe('viewer-1');
        expect(result.streamId).toBe('stream-1');
      }
      expect(viewerWriter.markEmailVerified).toHaveBeenCalledWith('viewer-1');
      expect(tokenWriter.markTokenUsed).toHaveBeenCalledWith('token-1');
    });

    it('should auto-resend on expired token', async () => {
      const expiredToken: EmailVerificationToken = {
        id: 'token-expired',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'expiredhash',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        usedAt: null,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

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

      // First call: find expired token
      vi.mocked(tokenReader.findValidToken).mockResolvedValue(null);
      
      // Fallback: find any token (even expired) to enable auto-resend
      vi.mocked(tokenReader).findValidToken = vi.fn()
        .mockResolvedValueOnce(null) // First call returns null (no valid token)
        .mockResolvedValueOnce(expiredToken); // Fallback finds expired

      vi.mocked(viewerReader.getById).mockResolvedValue(mockViewer);
      vi.mocked(tokenWriter.invalidateTokens).mockResolvedValue(0);
      vi.mocked(tokenWriter.createToken).mockResolvedValue({
        id: 'token-new',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'newhash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.verifyToken('expired-raw-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('expired');
        expect(result.resent).toBe(true);
      }
      expect(emailProvider.sendEmail).toHaveBeenCalled();
    });

    it('should reject used token', async () => {
      const usedToken: EmailVerificationToken = {
        id: 'token-used',
        viewerIdentityId: 'viewer-1',
        directStreamId: 'stream-1',
        tokenHash: 'usedhash',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        usedAt: new Date(Date.now() - 1000), // Already used
        createdAt: new Date(),
      };

      vi.mocked(tokenReader.findValidToken).mockResolvedValue(null);

      const result = await service.verifyToken('used-raw-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('invalid');
      }
    });

    it('should reject invalid token', async () => {
      vi.mocked(tokenReader.findValidToken).mockResolvedValue(null);

      const result = await service.verifyToken('completely-invalid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('invalid');
      }
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send email with verification link', async () => {
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

      vi.mocked(viewerReader.getById).mockResolvedValue(mockViewer);

      await service.sendVerificationEmail('viewer-1', 'stream-1', 'token123', 'Test Stream');

      expect(emailProvider.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: expect.stringContaining('Verify'),
        html: expect.stringContaining('token123'),
      });
    });
  });
});

