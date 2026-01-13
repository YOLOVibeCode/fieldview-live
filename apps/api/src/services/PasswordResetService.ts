/**
 * Password Reset Service Implementation
 * Handles password reset flow for OwnerUser and AdminAccount
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  IPasswordResetService,
  PasswordResetRequestInput,
  PasswordResetRequestResult,
  PasswordResetVerifyResult,
  PasswordResetConfirmInput,
  PasswordResetConfirmResult,
} from './IPasswordResetService';
import { IPasswordResetTokenRepository } from '../repositories/IPasswordResetTokenRepository';
import { hashPassword } from '../lib/password';
import { logger } from '../lib/logger';
import { authEmailService } from '../lib/authEmailService';
import { z } from 'zod';

// Password validation schema (inline due to import issues in tests)
const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Security constants
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;
const TOKEN_EXPIRY_MINUTES_OWNER = 15;
const TOKEN_EXPIRY_MINUTES_ADMIN = 10; // Shorter for admin accounts

export class PasswordResetService implements IPasswordResetService {
  constructor(
    private tokenRepo: IPasswordResetTokenRepository,
    private prisma: PrismaClient
  ) {}

  /**
   * Step 1: Request a password reset
   * Returns generic success message to prevent email enumeration
   */
  async requestReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult> {
    const { email, userType, ipAddress, userAgent } = input;

    try {
      // Check rate limiting
      const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000);
      const recentCount = await this.tokenRepo.countRecentByEmail(
        email,
        userType,
        oneHourAgo
      );

      if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
        return {
          success: false,
          message: 'Too many password reset requests. Please try again later.',
        };
      }

      // Find user by email and type
      const user = await this.findUserByEmail(email, userType);

      // SECURITY: Always return success to prevent email enumeration
      // Only create token if user exists
      if (user) {
        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Determine expiry based on user type
        const expiryMinutes =
          userType === 'admin_account'
            ? TOKEN_EXPIRY_MINUTES_ADMIN
            : TOKEN_EXPIRY_MINUTES_OWNER;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        // Create token
        await this.tokenRepo.create({
          tokenHash,
          userType,
          userId: user.id,
          email,
          expiresAt,
          ipAddress,
          userAgent,
        });

        // Get user's first name for personalization
        const userData = await this.findUserWithName(email, userType);

        // Send password reset email
        try {
          await authEmailService.sendPasswordResetEmail({
            to: email,
            token: rawToken,
            userType,
            firstName: userData?.firstName,
          });
          logger.info(`Password reset email sent to ${userType}: ${email}`);
        } catch (emailError) {
          logger.error({ error: emailError }, 'Failed to send password reset email');
          // Continue - token is created, user can try again
        }
      }

      // Generic success message (same whether user exists or not)
      return {
        success: true,
        message:
          'If an account exists with that email, you will receive a password reset link shortly.',
      };
    } catch (error) {
      logger.error({ error }, 'Error requesting password reset');
      // Still return generic message on error
      return {
        success: true,
        message:
          'If an account exists with that email, you will receive a password reset link shortly.',
      };
    }
  }

  /**
   * Step 2: Verify a reset token
   * Returns token validity and associated email
   */
  async verifyToken(token: string): Promise<PasswordResetVerifyResult> {
    try {
      // Hash the token to look it up
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const tokenData = await this.tokenRepo.findByTokenHash(tokenHash);

      if (!tokenData) {
        return {
          valid: false,
          error: 'Invalid or expired reset link.',
        };
      }

      // Check if token is expired
      if (tokenData.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'This reset link has expired. Please request a new one.',
        };
      }

      // Check if token was already used
      if (tokenData.usedAt) {
        return {
          valid: false,
          error: 'This reset link has already been used. Please request a new one.',
        };
      }

      return {
        valid: true,
        email: tokenData.email,
        userType: tokenData.userType,
        userId: tokenData.userId,
      };
    } catch (error) {
      logger.error({ error }, 'Error verifying reset token');
      return {
        valid: false,
        error: 'An error occurred. Please try again.',
      };
    }
  }

  /**
   * Step 3: Confirm password reset
   * Actually changes the password and invalidates tokens
   */
  async confirmReset(input: PasswordResetConfirmInput): Promise<PasswordResetConfirmResult> {
    const { token, newPassword } = input;

    // Validate new password
    const passwordValidation = newPasswordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return {
        success: false,
        message: passwordValidation.error.errors[0]?.message || 'Password is invalid.',
        error: passwordValidation.error.errors[0]?.message || 'Password is invalid.',
      };
    }

    // Verify token
    const verification = await this.verifyToken(token);
    if (!verification.valid) {
      const errorMessage = (verification as { message?: string }).message || 'Invalid token.';
      return {
        success: false,
        message: errorMessage,
        error: verification.error || 'Invalid token.',
      };
    }

    const { userType, userId } = verification;

    try {
      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password based on user type
      if (userType === 'owner_user') {
        await this.prisma.ownerUser.update({
          where: { id: userId },
          data: {
            passwordHash,
            lastPasswordResetAt: new Date(),
            passwordResetCount: {
              increment: 1,
            },
          },
        });
      } else if (userType === 'admin_account') {
        await this.prisma.adminAccount.update({
          where: { id: userId },
          data: {
            passwordHash,
            lastPasswordResetAt: new Date(),
            passwordResetCount: {
              increment: 1,
            },
            mfaResetRequired: true, // Force MFA re-setup for admin accounts
          },
        });
      }

      // Invalidate all reset tokens for this user
      await this.tokenRepo.invalidateAllForUser(userId!, userType!);

      logger.info(`Password successfully reset for ${userType}: ${userId}`);

      // TODO: Invalidate all active sessions (Phase 7 - Security)

      return {
        success: true,
        message: 'Your password has been successfully reset. You can now log in with your new password.',
      };
    } catch (error) {
      logger.error({ error }, 'Error confirming password reset');
      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
        error: 'An error occurred while resetting your password. Please try again.',
      };
    }
  }

  /**
   * Cleanup job: Delete expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const count = await this.tokenRepo.deleteExpired();
      logger.info(`Cleaned up ${count} expired password reset tokens`);
      return count;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired tokens');
      return 0;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Find user by email and type
   * Returns user with id, or null if not found
   */
  private async findUserByEmail(
    email: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<{ id: string } | null> {
    if (userType === 'owner_user') {
      const user = await this.prisma.ownerUser.findUnique({
        where: { email },
        select: { id: true },
      });
      return user;
    } else if (userType === 'admin_account') {
      const admin = await this.prisma.adminAccount.findUnique({
        where: { email },
        select: { id: true },
      });
      return admin;
    }

    return null;
  }

  /**
   * Find user with name for email personalization
   */
  private async findUserWithName(
    _email: string,
    _userType: 'owner_user' | 'admin_account'
  ): Promise<{ firstName?: string } | null> {
    // OwnerUser and AdminAccount don't have firstName fields
    // Return null to use generic email greeting
    return null;
  }
}

