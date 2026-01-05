/**
 * SendGrid Email Provider
 *
 * Sends emails via SendGrid API for production.
 */

import type { IEmailProvider, EmailOptions } from './IEmailProvider';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@fieldview.live';

export class SendGridEmailProvider implements IEmailProvider {
  private sgMail: any = null;

  private async getClient() {
    if (!this.sgMail) {
      // @sendgrid/mail exports the mail object directly
      const sendgridModule = await import('@sendgrid/mail');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      this.sgMail = sendgridModule;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if (this.sgMail && SENDGRID_API_KEY && typeof this.sgMail.setApiKey === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.sgMail.setApiKey(SENDGRID_API_KEY);
      }
    }
    return this.sgMail;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }

    const sgMail = await this.getClient();
    if (!sgMail) {
      throw new Error('Failed to initialize SendGrid client');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await sgMail.send({
      from: options.from || SENDGRID_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text || undefined,
      html: options.html || undefined,
    });
  }
}


