/**
 * ViewerAccessService Unit Tests (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewerAccessService } from '../../../src/services/ViewerAccessService';
import type { IDirectStreamRegistrationReader } from '../../../src/repositories/IDirectStreamRegistrationRepository';
import type { DirectStream, ViewerIdentity, DirectStreamRegistration } from '@prisma/client';

describe('ViewerAccessService', () => {
  let service: ViewerAccessService;
  let registrationReader: IDirectStreamRegistrationReader;

  beforeEach(() => {
    registrationReader = {
      findByStreamAndViewer: vi.fn(),
      findByStream: vi.fn(),
      countByStream: vi.fn(),
      findVerifiedByStream: vi.fn(),
    };

    service = new ViewerAccessService(registrationReader);
  });

  describe('canViewStream', () => {
    it('should allow anonymous if allowAnonymousView=true', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        allowAnonymousView: true,
        paywallEnabled: false,
        requireEmailVerification: true,
      };

      const result = await service.canViewStream(stream as DirectStream, null);

      expect(result.allowed).toBe(true);
    });

    it('should block anonymous if allowAnonymousView=false', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        allowAnonymousView: false,
        paywallEnabled: false,
        requireEmailVerification: true,
      };

      const result = await service.canViewStream(stream as DirectStream, null);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('anonymous_not_allowed');
      }
    });

    it('should require verified email if paywall enabled', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        allowAnonymousView: true,
        paywallEnabled: true,
        requireEmailVerification: true,
      };

      const unverifiedViewer: Partial<ViewerIdentity> = {
        id: 'viewer-1',
        email: 'test@example.com',
        emailVerifiedAt: null,
      };

      const result = await service.canViewStream(
        stream as DirectStream,
        unverifiedViewer as ViewerIdentity
      );

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('verification_required');
      }
    });

    it('should allow verified viewer with paywall', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        allowAnonymousView: true,
        paywallEnabled: true,
        requireEmailVerification: true,
      };

      const verifiedViewer: Partial<ViewerIdentity> = {
        id: 'viewer-1',
        email: 'test@example.com',
        emailVerifiedAt: new Date(),
      };

      const result = await service.canViewStream(
        stream as DirectStream,
        verifiedViewer as ViewerIdentity
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('canChat', () => {
    it('should require verified registration', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        chatEnabled: true,
        requireEmailVerification: true,
      };

      const viewer: Partial<ViewerIdentity> = {
        id: 'viewer-1',
        email: 'test@example.com',
        emailVerifiedAt: new Date(),
      };

      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(null);

      const result = await service.canChat(stream as DirectStream, viewer as ViewerIdentity);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('verification_required');
      }
    });

    it('should allow verified registration', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        chatEnabled: true,
        requireEmailVerification: true,
      };

      const viewer: Partial<ViewerIdentity> = {
        id: 'viewer-1',
        email: 'test@example.com',
        emailVerifiedAt: new Date(),
      };

      const registration: Partial<DirectStreamRegistration> = {
        id: 'reg-1',
        directStreamId: 'stream-1',
        viewerIdentityId: 'viewer-1',
        verifiedAt: new Date(),
      };

      vi.mocked(registrationReader.findByStreamAndViewer).mockResolvedValue(
        registration as DirectStreamRegistration
      );

      const result = await service.canChat(stream as DirectStream, viewer as ViewerIdentity);

      expect(result.allowed).toBe(true);
    });

    it('should block if chat disabled', async () => {
      const stream: Partial<DirectStream> = {
        id: 'stream-1',
        chatEnabled: false,
        requireEmailVerification: true,
      };

      const viewer: Partial<ViewerIdentity> = {
        id: 'viewer-1',
        email: 'test@example.com',
        emailVerifiedAt: new Date(),
      };

      const result = await service.canChat(stream as DirectStream, viewer as ViewerIdentity);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('chat_disabled');
      }
    });
  });
});

