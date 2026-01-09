/**
 * EmailVerification Repository Interface (ISP: Read/Write segregation)
 * 
 * Handles email verification tokens for DirectStream access.
 */

import type { EmailVerificationToken } from '@prisma/client';

export interface CreateTokenData {
  viewerIdentityId: string;
  directStreamId?: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Read operations for EmailVerificationToken
 */
export interface IEmailVerificationReader {
  /**
   * Find a valid (not expired, not used) token by hash
   */
  findValidToken(tokenHash: string): Promise<EmailVerificationToken | null>;

  /**
   * Find all active (not expired, not used) tokens for a viewer
   */
  findActiveTokensForViewer(
    viewerId: string,
    streamId?: string
  ): Promise<EmailVerificationToken[]>;
}

/**
 * Write operations for EmailVerificationToken
 */
export interface IEmailVerificationWriter {
  /**
   * Create a new verification token
   */
  createToken(data: CreateTokenData): Promise<EmailVerificationToken>;

  /**
   * Mark token as used
   */
  markTokenUsed(id: string): Promise<EmailVerificationToken>;

  /**
   * Invalidate (delete) all active tokens for a viewer
   * Returns count of deleted tokens
   */
  invalidateTokens(viewerId: string, streamId?: string): Promise<number>;
}

