/**
 * Viewer Refresh Service Implementation
 * Handles viewer access refresh/re-consent flow
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  IViewerRefreshService,
  ViewerRefreshRequestInput,
  ViewerRefreshRequestResult,
  ViewerRefreshVerifyResult,
} from './IViewerRefreshService';
import { IViewerRefreshTokenRepository } from '../repositories/IViewerRefreshTokenRepository';
import { logger } from '../lib/logger';
import { authEmailService } from '../lib/authEmailService';

// Security constants
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;
const TOKEN_EXPIRY_MINUTES = 15;

export class ViewerRefreshService implements IViewerRefreshService {
  constructor(
    private tokenRepo: IViewerRefreshTokenRepository,
    private prisma: PrismaClient
  ) {}

  /**
   * Step 1: Request access refresh
   * Returns generic success message to prevent email enumeration
   */
  async requestRefresh(input: ViewerRefreshRequestInput): Promise<ViewerRefreshRequestResult> {
    const { email, directStreamId, gameId, redirectUrl } = input;

    try {
      // Check rate limiting
      const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000);
      const recentCount = await this.tokenRepo.countRecentByEmail(email, oneHourAgo);

      if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
        return {
          success: false,
          message: 'Too many access refresh requests. Please try again later.',
        };
      }

      // Find viewer by email
      const viewer = await this.prisma.viewerIdentity.findUnique({
        where: { email },
        select: { id: true },
      });

      // SECURITY: Always return success to prevent email enumeration
      // Only create token if viewer exists
      if (viewer) {
        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Calculate expiry
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

        // Create token
        await this.tokenRepo.create({
          tokenHash,
          viewerIdentityId: viewer.id,
          directStreamId,
          gameId,
          redirectUrl,
          expiresAt,
        });

        // Get viewer details and stream title for personalization
        const viewerData = await this.prisma.viewerIdentity.findUnique({
          where: { id: viewer.id },
          select: { firstName: true },
        });

        let streamTitle: string | undefined;
        if (directStreamId) {
          const stream = await this.prisma.directStream.findUnique({
            where: { id: directStreamId },
            select: { title: true },
          });
          streamTitle = stream?.title;
        }

        // Send viewer refresh email
        try {
          await authEmailService.sendViewerRefreshEmail({
            to: email,
            token: rawToken,
            firstName: viewerData?.firstName || undefined,
            streamTitle,
          });
          logger.info(`Viewer access refresh email sent to: ${email}`);
        } catch (emailError) {
          logger.error({ error: emailError }, 'Failed to send viewer refresh email');
          // Continue - token is created, user can try again
        }
      }

      // Generic success message (same whether viewer exists or not)
      return {
        success: true,
        message:
          'If an account exists with that email, you will receive a link to continue watching shortly.',
      };
    } catch (error) {
      logger.error({ error }, 'Error requesting viewer access refresh');
      // Still return generic message on error
      return {
        success: true,
        message:
          'If an account exists with that email, you will receive a link to continue watching shortly.',
      };
    }
  }

  /**
   * Step 2: Verify and restore access
   * Validates token and returns viewer info for creating new session
   */
  async verifyAndRestoreAccess(token: string): Promise<ViewerRefreshVerifyResult> {
    try {
      // Hash the token to look it up
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const tokenData = await this.tokenRepo.findByTokenHash(tokenHash);

      if (!tokenData) {
        return {
          valid: false,
          error: 'Invalid or expired access link.',
        };
      }

      // Check if token is expired
      if (tokenData.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'This access link has expired. Please request a new one.',
        };
      }

      // Check if token was already used
      if (tokenData.usedAt) {
        return {
          valid: false,
          error: 'This access link has already been used. Please request a new one.',
        };
      }

      // Mark token as used
      await this.tokenRepo.markAsUsed(tokenData.id);

      logger.info(`Viewer access restored for identity: ${tokenData.viewerIdentityId}`);

      return {
        valid: true,
        viewerIdentityId: tokenData.viewerIdentityId,
        redirectUrl: tokenData.redirectUrl || undefined,
      };
    } catch (error) {
      logger.error({ error }, 'Error verifying refresh token');
      return {
        valid: false,
        error: 'An error occurred. Please try again.',
      };
    }
  }

  /**
   * Cleanup job: Delete expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const count = await this.tokenRepo.deleteExpired();
      logger.info(`Cleaned up ${count} expired viewer refresh tokens`);
      return count;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired viewer refresh tokens');
      return 0;
    }
  }
}

