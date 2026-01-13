/**
 * Authentication Email Service
 * Handles sending all authentication-related emails
 */

import { getEmailProvider } from './email';
import { logger } from './logger';

const BASE_URL = process.env.APP_URL || 'http://localhost:4300';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@fieldview.live';
const COMPANY_NAME = 'FieldView.Live';

export class AuthEmailService {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    token: string;
    userType: 'owner_user' | 'admin_account';
    firstName?: string;
  }): Promise<void> {
    const { to, token, userType, firstName } = params;

    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
    const expiryMinutes = userType === 'admin_account' ? 10 : 15;

    const html = this.buildPasswordResetHtml({
      resetUrl,
      expiryMinutes,
      userType,
      firstName,
    });

    const text = this.buildPasswordResetText({
      resetUrl,
      expiryMinutes,
      userType,
      firstName,
    });

    const emailProvider = getEmailProvider();

    try {
      await emailProvider.sendEmail({
        to,
        from: FROM_EMAIL,
        subject: userType === 'admin_account' 
          ? '🔒 Admin Password Reset Request'
          : 'Reset your FieldView password',
        html,
        text,
      });

      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error({ error }, 'Failed to send password reset email');
      throw error;
    }
  }

  /**
   * Send viewer access refresh email
   */
  async sendViewerRefreshEmail(params: {
    to: string;
    token: string;
    firstName?: string;
    streamTitle?: string;
  }): Promise<void> {
    const { to, token, firstName, streamTitle } = params;

    const refreshUrl = `${BASE_URL}/verify-access?token=${token}`;

    const html = this.buildViewerRefreshHtml({
      refreshUrl,
      firstName,
      streamTitle,
    });

    const text = this.buildViewerRefreshText({
      refreshUrl,
      firstName,
      streamTitle,
    });

    const emailProvider = getEmailProvider();

    try {
      await emailProvider.sendEmail({
        to,
        from: FROM_EMAIL,
        subject: streamTitle 
          ? `Continue watching: ${streamTitle}`
          : 'Continue watching your stream',
        html,
        text,
      });

      logger.info(`Viewer refresh email sent to ${to}`);
    } catch (error) {
      logger.error({ error }, 'Failed to send viewer refresh email');
      throw error;
    }
  }

  // ============================================
  // HTML TEMPLATES
  // ============================================

  private buildPasswordResetHtml(params: {
    resetUrl: string;
    expiryMinutes: number;
    userType: string;
    firstName?: string;
  }): string {
    const { resetUrl, expiryMinutes, userType, firstName } = params;
    const greeting = firstName ? `Hi ${firstName}` : 'Hello';
    const isAdmin = userType === 'admin_account';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ${isAdmin ? '🔒 ' : ''}${COMPANY_NAME}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <td style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #f1f5f9; font-size: 20px; font-weight: 600;">
              ${greeting},
            </h2>
            
            <p style="margin: 0 0 20px; color: #cbd5e1; line-height: 1.6; font-size: 16px;">
              We received a request to reset the password for your ${isAdmin ? 'admin ' : ''}FieldView account.
            </p>
            
            ${isAdmin ? `
            <div style="background-color: #ef4444; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #ffffff; font-size: 14px;">
                <strong>⚠️  IMPORTANT:</strong> After resetting your password, you will need to re-setup MFA (2FA).
              </p>
            </div>
            ` : ''}
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 20px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
              This link expires in <strong style="color: #f1f5f9;">${expiryMinutes} minutes</strong>.
            </p>
            
            <p style="margin: 20px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Or copy and paste this URL into your browser:
            </p>
            
            <p style="margin: 0 0 20px; padding: 12px; background-color: #0f172a; border-radius: 4px; word-break: break-all; font-size: 13px; color: #94a3b8; font-family: monospace;">
              ${resetUrl}
            </p>
            
            <div style="border-top: 1px solid #334155; padding-top: 20px; margin-top: 30px;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
              </p>
            </div>
          </td>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} ${COMPANY_NAME} • Live Sports Streaming
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private buildViewerRefreshHtml(params: {
    refreshUrl: string;
    firstName?: string;
    streamTitle?: string;
  }): string {
    const { refreshUrl, firstName, streamTitle } = params;
    const greeting = firstName ? `Hi ${firstName}` : 'Hello';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Continue Watching</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🎬 ${COMPANY_NAME}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #f1f5f9; font-size: 20px; font-weight: 600;">
                ${greeting},
              </h2>
              
              ${streamTitle ? `
              <p style="margin: 0 0 20px; color: #cbd5e1; line-height: 1.6; font-size: 16px;">
                Your viewing session for <strong style="color: #f1f5f9;">"${streamTitle}"</strong> has expired.
              </p>
              ` : `
              <p style="margin: 0 0 20px; color: #cbd5e1; line-height: 1.6; font-size: 16px;">
                Your viewing session has expired.
              </p>
              `}
              
              <p style="margin: 0 0 20px; color: #cbd5e1; line-height: 1.6; font-size: 16px;">
                Click below to continue watching:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${refreshUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                      Continue Watching
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                This link expires in <strong style="color: #f1f5f9;">15 minutes</strong>.
              </p>
              
              <p style="margin: 20px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Or copy and paste this URL into your browser:
              </p>
              
              <p style="margin: 0 0 20px; padding: 12px; background-color: #0f172a; border-radius: 4px; word-break: break-all; font-size: 13px; color: #94a3b8; font-family: monospace;">
                ${refreshUrl}
              </p>
              
              <div style="border-top: 1px solid #334155; padding-top: 20px; margin-top: 30px;">
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  If you didn't request this, you can safely ignore this email. Your access will not be changed.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} ${COMPANY_NAME} • Live Sports Streaming
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  // ============================================
  // PLAIN TEXT TEMPLATES
  // ============================================

  private buildPasswordResetText(params: {
    resetUrl: string;
    expiryMinutes: number;
    userType: string;
    firstName?: string;
  }): string {
    const { resetUrl, expiryMinutes, userType, firstName } = params;
    const greeting = firstName ? `Hi ${firstName}` : 'Hello';
    const isAdmin = userType === 'admin_account';

    return `
${greeting},

We received a request to reset the password for your ${isAdmin ? 'admin ' : ''}FieldView account.

${isAdmin ? '⚠️  IMPORTANT: After resetting your password, you will need to re-setup MFA (2FA).\n\n' : ''}Click the link below to reset your password:

${resetUrl}

This link expires in ${expiryMinutes} minutes.

If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.

---
© ${new Date().getFullYear()} ${COMPANY_NAME} • Live Sports Streaming
    `.trim();
  }

  private buildViewerRefreshText(params: {
    refreshUrl: string;
    firstName?: string;
    streamTitle?: string;
  }): string {
    const { refreshUrl, firstName, streamTitle } = params;
    const greeting = firstName ? `Hi ${firstName}` : 'Hello';

    return `
${greeting},

${streamTitle ? `Your viewing session for "${streamTitle}" has expired.` : 'Your viewing session has expired.'}

Click the link below to continue watching:

${refreshUrl}

This link expires in 15 minutes.

If you didn't request this, you can safely ignore this email. Your access will not be changed.

---
© ${new Date().getFullYear()} ${COMPANY_NAME} • Live Sports Streaming
    `.trim();
  }
}

// Export singleton instance
export const authEmailService = new AuthEmailService();

