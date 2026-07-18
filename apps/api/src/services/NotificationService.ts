/**
 * Notification Service
 *
 * Sends notifications (email/SMS) to subscribers when events go live.
 */

import { prisma } from '../lib/prisma';
import { getEmailProvider } from '../lib/email';
import { twilioClient, twilioPhoneNumber } from '../lib/twilio';
import type { IViewerIdentityReader } from '../repositories/IViewerIdentityRepository';

import type {
  EventLiveNotificationData,
  INotificationService,
  NotificationTarget,
} from './INotificationService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

export class NotificationService implements INotificationService {
  constructor(private viewerIdentityReader: IViewerIdentityReader) {}

  async notifyEventLive(subscribers: NotificationTarget[], eventData: EventLiveNotificationData): Promise<void> {
    const watchUrl = `${APP_URL}${eventData.canonicalPath}`;
    const message = eventData.isPayPerView
      ? `Stream is live! Watch now: ${watchUrl}${eventData.checkoutUrl ? ` (Pay: ${eventData.checkoutUrl})` : ''}`
      : `Stream is live! Watch now: ${watchUrl}`;

    const emailSubject = `Stream is live: ${eventData.orgShortName} ${eventData.teamSlug}`;
    const emailBody = `The stream for ${eventData.orgShortName} ${eventData.teamSlug} is now live.\n\nWatch here: ${watchUrl}${eventData.checkoutUrl ? `\n\nPay to watch: ${eventData.checkoutUrl}` : ''}`;

    // Send notifications based on preference
    const promises = subscribers.map(async (subscriber) => {
      if (subscriber.preference === 'email' && subscriber.email) {
        await this.sendEmail(subscriber.email, emailSubject, emailBody);
      } else if (subscriber.preference === 'sms' && subscriber.phoneE164) {
        await this.sendSms(subscriber.phoneE164, message);
      } else if (subscriber.preference === 'both') {
        const p: Promise<void>[] = [];
        if (subscriber.email) {
          p.push(this.sendEmail(subscriber.email, emailSubject, emailBody));
        }
        if (subscriber.phoneE164) {
          p.push(this.sendSms(subscriber.phoneE164, message));
        }
        await Promise.allSettled(p);
      }
    });

    await Promise.allSettled(promises);
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const emailProvider = getEmailProvider();
    
    await emailProvider.sendEmail({
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'), // Simple text-to-HTML conversion
    });
  }

  async sendSms(phoneE164: string, message: string): Promise<void> {
    // Check if viewer has opted out
    const viewer = await this.viewerIdentityReader.getByPhone(phoneE164);
    if (viewer?.smsOptOut) {
      return; // Silently skip if opted out
    }

    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneE164,
    });

    // Log SMS message
    await prisma.sMSMessage.create({
      data: {
        direction: 'outbound',
        phoneE164,
        messageBody: message,
        status: 'sent',
      },
    });
  }
}

