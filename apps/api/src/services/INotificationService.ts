/**
 * Notification Service Interface (ISP)
 *
 * Single responsibility: send notifications to subscribers.
 */

export interface NotificationTarget {
  email?: string;
  phoneE164?: string;
  preference: 'email' | 'sms' | 'both';
}

export interface EventLiveNotificationData {
  eventId: string;
  canonicalPath: string;
  orgShortName: string;
  teamSlug: string;
  isPayPerView: boolean;
  checkoutUrl?: string;
}

export interface INotificationService {
  /**
   * Notify subscribers that an event has gone live.
   */
  notifyEventLive(subscribers: NotificationTarget[], eventData: EventLiveNotificationData): Promise<void>;

  /**
   * Send email notification (if email provider is configured).
   */
  sendEmail(to: string, subject: string, body: string): Promise<void>;

  /**
   * Send SMS notification via Twilio.
   */
  sendSms(phoneE164: string, message: string): Promise<void>;
}


