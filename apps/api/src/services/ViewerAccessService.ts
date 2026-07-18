/**
 * ViewerAccessService Implementation
 * 
 * Enforces access control rules for DirectStream viewing and chat.
 */

import type { IViewerAccessService, AccessResult } from './IViewerAccessService';
import type { IDirectStreamRegistrationReader } from '../repositories/IDirectStreamRegistrationRepository';
import type { DirectStream, ViewerIdentity } from '@prisma/client';
import { logger } from '../lib/logger';

export class ViewerAccessService implements IViewerAccessService {
  constructor(private registrationReader: IDirectStreamRegistrationReader) {}

  async canViewStream(stream: DirectStream, viewer: ViewerIdentity | null): Promise<AccessResult> {
    // Rule 1: Anonymous viewing
    if (!viewer) {
      if (stream.allowAnonymousView) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'anonymous_not_allowed' };
    }

    // Rule 2: Paywall ALWAYS requires verified email
    if (stream.paywallEnabled && !viewer.emailVerifiedAt) {
      return { allowed: false, reason: 'verification_required' };
    }

    // Rule 3: requireEmailVerification setting (unless paywall overrides)
    if (stream.requireEmailVerification && !viewer.emailVerifiedAt) {
      return { allowed: false, reason: 'verification_required' };
    }

    // All checks passed
    return { allowed: true };
  }

  async canChat(stream: DirectStream, viewer: ViewerIdentity | null): Promise<AccessResult> {
    // Rule 1: Chat must be enabled
    if (!stream.chatEnabled) {
      return { allowed: false, reason: 'chat_disabled' };
    }

    // Rule 2: No anonymous chat
    if (!viewer) {
      return { allowed: false, reason: 'anonymous_not_allowed' };
    }

    // Rule 3: Must be verified
    if (!viewer.emailVerifiedAt) {
      return { allowed: false, reason: 'verification_required' };
    }

    // Rule 4: Must be registered for this specific stream
    const registration = await this.registrationReader.findByStreamAndViewer(
      stream.id,
      viewer.id
    );

    if (!registration || !registration.verifiedAt) {
      return { allowed: false, reason: 'verification_required' };
    }

    // All checks passed
    logger.debug({ streamId: stream.id, viewerId: viewer.id }, 'Chat access granted');
    return { allowed: true };
  }
}

