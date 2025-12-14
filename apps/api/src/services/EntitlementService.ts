/**
 * Entitlement Service Implementation
 * 
 * Implements IEntitlementReader and IEntitlementWriter.
 * Handles entitlement token validation and playback session creation.
 */

import { ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import type { IEntitlementReader as IEntitlementRepoReader } from '../repositories/IEntitlementRepository';
import type { IPlaybackSessionWriter } from '../repositories/IPlaybackSessionRepository';
import type { IEntitlementReader, IEntitlementWriter, EntitlementValidationResult } from './IEntitlementService';
import type { PlaybackSession } from '@prisma/client';

export class EntitlementService implements IEntitlementReader, IEntitlementWriter {
  constructor(
    private entitlementRepo: IEntitlementRepoReader,
    private playbackSessionWriter: IPlaybackSessionWriter
  ) {}

  async validateToken(tokenId: string): Promise<EntitlementValidationResult> {
    // Find entitlement by tokenId
    const entitlement = await this.entitlementRepo.getByTokenId(tokenId);
    if (!entitlement) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    // Check if entitlement is active
    if (entitlement.status !== 'active') {
      return {
        valid: false,
        error: 'Entitlement is not active',
        entitlement,
      };
    }

    // Check expiration
    const now = new Date();
    if (entitlement.validTo < now) {
      return {
        valid: false,
        error: 'Token has expired',
        entitlement,
      };
    }

    if (entitlement.validFrom > now) {
      return {
        valid: false,
        error: 'Token is not yet valid',
        entitlement,
      };
    }

    return {
      valid: true,
      entitlement,
    };
  }

  async createPlaybackSession(entitlementId: string, _metadata?: Record<string, unknown>): Promise<PlaybackSession> {
    // Verify entitlement exists and is valid
    const entitlement = await this.entitlementRepo.getById(entitlementId);
    if (!entitlement) {
      throw new NotFoundError('Entitlement not found');
    }

    // Check if entitlement is active
    if (entitlement.status !== 'active') {
      throw new ForbiddenError('Entitlement is not active');
    }

    // Check expiration
    const now = new Date();
    if (entitlement.validTo < now) {
      throw new UnauthorizedError('Entitlement has expired');
    }

    if (entitlement.validFrom > now) {
      throw new UnauthorizedError('Entitlement is not yet valid');
    }

    // Create playback session
    return this.playbackSessionWriter.create({
      entitlementId,
      startedAt: new Date(),
    });
  }
}
