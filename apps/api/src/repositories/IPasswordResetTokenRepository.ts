/**
 * Password Reset Token Repository Interface (ISP)
 * Segregated Reader and Writer interfaces for password reset tokens
 */

export interface PasswordResetTokenData {
  id: string;
  tokenHash: string;
  userType: 'owner_user' | 'admin_account';
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatePasswordResetTokenInput {
  tokenHash: string;
  userType: 'owner_user' | 'admin_account';
  userId: string;
  email: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Reader interface - Query operations only
 */
export interface IPasswordResetTokenReader {
  /**
   * Find a token by its hash
   */
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null>;

  /**
   * Find unexpired tokens for an email/userType combination
   */
  findUnexpiredByEmail(
    email: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<PasswordResetTokenData[]>;

  /**
   * Count recent token requests by email (for rate limiting)
   */
  countRecentByEmail(
    email: string,
    userType: 'owner_user' | 'admin_account',
    sinceDate: Date
  ): Promise<number>;

  /**
   * Find all tokens for a specific user
   */
  findByUserId(
    userId: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<PasswordResetTokenData[]>;
}

/**
 * Writer interface - Mutation operations only
 */
export interface IPasswordResetTokenWriter {
  /**
   * Create a new password reset token
   */
  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenData>;

  /**
   * Mark a token as used
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Invalidate all tokens for a user (e.g., after password reset)
   */
  invalidateAllForUser(
    userId: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<number>;

  /**
   * Delete expired tokens (cleanup job)
   */
  deleteExpired(): Promise<number>;
}

/**
 * Combined interface for convenience
 */
export interface IPasswordResetTokenRepository
  extends IPasswordResetTokenReader,
    IPasswordResetTokenWriter {}

