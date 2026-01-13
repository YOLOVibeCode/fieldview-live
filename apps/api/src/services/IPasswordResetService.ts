/**
 * Password Reset Service Interface (ISP)
 * Handles password reset flow for OwnerUser and AdminAccount
 */

export interface PasswordResetRequestInput {
  email: string;
  userType: 'owner_user' | 'admin_account';
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
  // Note: Never return whether email exists (prevent enumeration)
}

export interface PasswordResetVerifyResult {
  valid: boolean;
  email?: string;
  userType?: 'owner_user' | 'admin_account';
  userId?: string;
  error?: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface PasswordResetConfirmResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Password Reset Service - Business logic for password resets
 */
export interface IPasswordResetService {
  /**
   * Step 1: Request a password reset (sends email with token)
   * Returns generic success message regardless of whether email exists
   */
  requestReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult>;

  /**
   * Step 2: Verify a reset token (called when user clicks email link)
   * Returns token validity and associated email (for UI display)
   */
  verifyToken(token: string): Promise<PasswordResetVerifyResult>;

  /**
   * Step 3: Confirm password reset (actually change the password)
   * Invalidates all tokens and sessions for the user
   */
  confirmReset(input: PasswordResetConfirmInput): Promise<PasswordResetConfirmResult>;

  /**
   * Cleanup job: Delete expired tokens
   */
  cleanupExpiredTokens(): Promise<number>;
}

