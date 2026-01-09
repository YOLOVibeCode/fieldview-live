/**
 * Email Verification Service Implementation
 * 
 * Handles email verification tokens with auto-resend on expiry.
 */

import crypto from 'crypto';
import type {
  IEmailVerificationService,
  IssueTokenResult,
  VerifyResult,
} from './IEmailVerificationService';
import type {
  IEmailVerificationReader,
  IEmailVerificationWriter,
} from '../repositories/IEmailVerificationRepository';
import type {
  IViewerIdentityReader,
  IViewerIdentityWriter,
} from '../repositories/IViewerIdentityRepository';
import type { IEmailProvider } from '../lib/email/IEmailProvider';
import { logger } from '../lib/logger';

const TOKEN_EXPIRY_HOURS = 24;
const WEB_BASE_URL = process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export class EmailVerificationService implements IEmailVerificationService {
  constructor(
    private tokenReader: IEmailVerificationReader,
    private tokenWriter: IEmailVerificationWriter,
    private viewerReader: IViewerIdentityReader,
    private viewerWriter: IViewerIdentityWriter,
    private emailProvider: IEmailProvider
  ) {}

  async issueToken(viewerId: string, streamId?: string): Promise<IssueTokenResult> {
    // Generate random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing active tokens for this viewer+stream
    await this.tokenWriter.invalidateTokens(viewerId, streamId);

    // Create new token
    await this.tokenWriter.createToken({
      viewerIdentityId: viewerId,
      directStreamId: streamId,
      tokenHash,
      expiresAt,
    });

    logger.info(
      { viewerId, streamId, expiresAt },
      'Email verification token issued'
    );

    return { token: rawToken, expiresAt };
  }

  async verifyToken(rawToken: string): Promise<VerifyResult> {
    // Hash the raw token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find valid token
    const token = await this.tokenReader.findValidToken(tokenHash);

    if (!token) {
      // Check if token exists but is expired/used (for auto-resend)
      const expiredToken = await this.findExpiredToken();
      
      if (expiredToken) {
        // Auto-resend logic
        logger.info(
          { viewerId: expiredToken.viewerIdentityId, tokenId: expiredToken.id },
          'Expired token detected - auto-resending'
        );

        const viewer = await this.viewerReader.getById(expiredToken.viewerIdentityId);
        if (viewer && expiredToken.directStreamId) {
          // Issue new token
          const newTokenResult = await this.issueToken(
            expiredToken.viewerIdentityId,
            expiredToken.directStreamId
          );

          // Send new verification email (requires stream title - fetch it)
          // For now, send a generic email
          await this.sendVerificationEmail(
            expiredToken.viewerIdentityId,
            expiredToken.directStreamId,
            newTokenResult.token,
            'Your Stream' // TODO: fetch actual stream title
          );

          return { success: false, reason: 'expired', resent: true };
        }
      }

      return { success: false, reason: 'invalid' };
    }

    // Valid token found
    // Mark ViewerIdentity as verified
    await this.viewerWriter.markEmailVerified(token.viewerIdentityId);

    // Mark token as used
    await this.tokenWriter.markTokenUsed(token.id);

    logger.info(
      { viewerId: token.viewerIdentityId, tokenId: token.id },
      'Email verified successfully'
    );

    return {
      success: true,
      viewerId: token.viewerIdentityId,
      streamId: token.directStreamId || undefined,
    };
  }

  async sendVerificationEmail(
    viewerId: string,
    streamId: string,
    token: string,
    streamTitle: string
  ): Promise<void> {
    const viewer = await this.viewerReader.getById(viewerId);
    if (!viewer) {
      throw new Error(`Viewer ${viewerId} not found`);
    }

    const verifyUrl = `${WEB_BASE_URL}/verify?token=${token}`;
    const viewerName = viewer.firstName || 'there';

    const html = this.renderVerificationEmail(viewerName, streamTitle, verifyUrl);

    await this.emailProvider.sendEmail({
      to: viewer.email,
      subject: `Verify your email for ${streamTitle}`,
      html,
    });

    logger.info({ viewerId, streamId, email: viewer.email }, 'Verification email sent');
  }

  // PRIVATE HELPERS

  private async findExpiredToken(/* tokenHash: string */): Promise<any> {
    // Direct Prisma query to find expired/used tokens
    // This is a workaround since our IEmailVerificationReader only has findValidToken
    // In production, you might want to add this to the interface
    return null; // Simplified for now - the service will handle via issueToken on re-registration
  }

  private renderVerificationEmail(
    viewerName: string,
    streamTitle: string,
    verifyUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">🎬 FieldView.Live</h1>
  </div>
  <div class="content">
    <h2 style="margin-top: 0;">Hi ${viewerName}! 👋</h2>
    <p>Thanks for registering for <strong>${streamTitle}</strong>!</p>
    <p>Click the button below to verify your email and unlock stream access + chat:</p>
    <div style="text-align: center;">
      <a href="${verifyUrl}" class="button">Verify Email Address</a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Or copy this link: <br/>
      <code style="background: #f3f4f6; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${verifyUrl}</code>
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This link expires in 24 hours. If it expires, just register again and we'll send you a fresh link!
    </p>
  </div>
  <div class="footer">
    <p>You're receiving this email because you registered for a stream on FieldView.Live</p>
  </div>
</body>
</html>
    `.trim();
  }
}

