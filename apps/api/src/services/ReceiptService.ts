/**
 * Receipt Service
 *
 * Sends purchase receipt emails via the configured email provider.
 */

import type { IEmailProvider } from '../lib/email/IEmailProvider';
import { logger } from '../lib/logger';

export interface PurchaseReceiptInput {
  to: string;
  purchaseId: string;
  amountCents: number;
  currency: string;
  streamUrl: string | null;
}

export class ReceiptService {
  constructor(
    private emailProvider: IEmailProvider,
    private appUrl: string
  ) {}

  async sendPurchaseReceipt(input: PurchaseReceiptInput): Promise<void> {
    const subject = 'Your FieldView.Live receipt';

    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: input.currency,
    }).format(input.amountCents / 100);

    const fallbackUrl = `${this.appUrl}/checkout/${input.purchaseId}/success`;
    const watchUrl = input.streamUrl ?? fallbackUrl;

    const text = [
      `Thanks for your purchase!`,
      ``,
      `Amount: ${amount}`,
      `Purchase ID: ${input.purchaseId}`,
      ``,
      `Watch: ${watchUrl}`,
      ``,
      `If you have any issues, reply to this email.`,
    ].join('\n');

    try {
      await this.emailProvider.sendEmail({
        to: input.to,
        subject,
        text,
        html: text.replace(/\n/g, '<br>'),
      });
    } catch (error) {
      logger.warn({ error, purchaseId: input.purchaseId }, 'Failed to send purchase receipt email');
    }
  }
}


