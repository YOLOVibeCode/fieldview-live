/**
 * Email Verification Service Interface
 * 
 * Handles email verification tokens and verification flow.
 */

export interface IssueTokenResult {
  token: string; // Raw token (to be sent to viewer)
  expiresAt: Date;
}

export type VerifyResult =
  | { success: true; viewerId: string; streamId?: string }
  | { success: false; reason: 'expired' | 'used' | 'invalid'; resent?: boolean };

export interface IEmailVerificationService {
  /**
   * Issue a new verification token for a viewer
   * Invalidates any existing active tokens for the same viewer+stream
   */
  issueToken(viewerId: string, streamId?: string): Promise<IssueTokenResult>;

  /**
   * Verify a token
   * If expired, auto-issues a new token and sends email (returns resent=true)
   * If valid, marks ViewerIdentity as verified and token as used
   */
  verifyToken(rawToken: string): Promise<VerifyResult>;

  /**
   * Send verification email to viewer
   */
  sendVerificationEmail(
    viewerId: string,
    streamId: string,
    token: string,
    streamTitle: string
  ): Promise<void>;
}

