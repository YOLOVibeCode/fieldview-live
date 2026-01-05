/**
 * Email Provider Interface
 *
 * Abstraction for email sending providers (Mailpit, SendGrid, etc.)
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface IEmailProvider {
  /**
   * Send an email
   */
  sendEmail(options: EmailOptions): Promise<void>;
}


