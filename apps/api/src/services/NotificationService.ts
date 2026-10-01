/**
 * Notification Service — email/SMS when events go live.
 */

import { SMS_PURPOSE_VIEWER_NOTIFICATIONS } from '@fieldview/data-model';

import { getEmailProvider } from '../lib/email';
import { prisma } from '../lib/prisma';
import { SmsConsentRepository } from '../repositories/implementations/SmsConsentRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import type { IViewerIdentityReader } from '../repositories/IViewerIdentityRepository';

import type {
  EventLiveNotificationData,
  INotificationService,
  NotificationTarget,
} from './INotificationService';
import { SmsComplianceService } from './SmsComplianceService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

export class NotificationService implements INotificationService {
  private smsCompliance: SmsComplianceService;

  constructor(private viewerIdentityReader: IViewerIdentityReader, smsCompliance?: SmsComplianceService) {
    const consentRepo = new SmsConsentRepository(prisma);
    const viewerRepo =
      viewerIdentityReader instanceof ViewerIdentityRepository
        ? viewerIdentityReader
        : new ViewerIdentityRepository(prisma);
    this.smsCompliance =
      smsCompliance ?? new SmsComplianceService(consentRepo, consentRepo, viewerRepo, viewerRepo);
  }

  async notifyEventLive(subscribers: NotificationTarget[], eventData: EventLiveNotificationData): Promise<void> {
    const watchUrl = `${APP_URL}${eventData.canonicalPath}`;
    const message = eventData.isPayPerView
      ? `Stream is live! Watch now: ${watchUrl}${eventData.checkoutUrl ? ` (Pay: ${eventData.checkoutUrl})` : ''}`
      : `Stream is live! Watch now: ${watchUrl}`;

    const emailSubject = `Stream is live: ${eventData.orgShortName} ${eventData.teamSlug}`;
    const emailBody = `The stream for ${eventData.orgShortName} ${eventData.teamSlug} is now live.\n\nWatch here: ${watchUrl}${eventData.checkoutUrl ? `\n\nPay to watch: ${eventData.checkoutUrl}` : ''}`;

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
      html: body.replace(/\n/g, '<br>'),
    });
  }

  async sendSms(phoneE164: string, message: string): Promise<void> {
    try {
      await this.smsCompliance.send({
        phoneE164,
        body: message,
        purpose: SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      });
    } catch {
      // Silently skip if opted out or no consent
    }
  }
}
