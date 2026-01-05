/**
 * Mailpit Email Provider
 *
 * Sends emails via Mailpit SMTP for local testing.
 */

import type { IEmailProvider, EmailOptions } from './IEmailProvider';

const MAILPIT_HOST = process.env.MAILPIT_HOST || 'localhost';
const MAILPIT_PORT = parseInt(process.env.MAILPIT_PORT || '1025', 10);
const MAILPIT_FROM = process.env.MAILPIT_FROM_EMAIL || 'noreply@fieldview.live';

export class MailpitEmailProvider implements IEmailProvider {
  private nodemailer: typeof import('nodemailer') | null = null;

  private async getTransporter() {
    if (!this.nodemailer) {
      this.nodemailer = await import('nodemailer');
    }

    return this.nodemailer.createTransport({
      host: MAILPIT_HOST,
      port: MAILPIT_PORT,
      secure: false, // Mailpit uses plain SMTP
      // No auth required for Mailpit
    } as any);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      
      await transporter.sendMail({
        from: options.from || MAILPIT_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html?.replace(/<[^>]*>/g, '') || '',
        html: options.html,
      });
    } catch (error) {
      // If Mailpit is not available, log and continue (for development)
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[MAILPIT] Failed to send email to ${options.to}:`, error);
        console.log(`[MAILPIT] Email would be sent:`, {
          to: options.to,
          subject: options.subject,
          text: options.text,
        });
      } else {
        throw error;
      }
    }
  }
}

