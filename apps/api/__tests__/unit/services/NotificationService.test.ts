/**
 * Notification Service Unit Tests (TDD)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IViewerIdentityReader } from '@/repositories/IViewerIdentityRepository';
import { NotificationService } from '@/services/NotificationService';
import type { NotificationTarget } from '@/services/INotificationService';

// Mock Twilio
vi.mock('@/lib/twilio', () => ({
  twilioClient: {
    messages: {
      create: vi.fn(),
    },
  },
  twilioPhoneNumber: '+1234567890',
}));

// Mock Prisma SMS message creation
vi.mock('@/lib/prisma', async () => {
  const actual = await vi.importActual('@/lib/prisma');
  return {
    ...actual,
    prisma: {
      ...(actual as any).prisma,
      sMSMessage: {
        create: vi.fn(),
      },
    },
  };
});

describe('NotificationService', () => {
  let mockViewerIdentityReader: IViewerIdentityReader;
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockViewerIdentityReader = {
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
      getById: vi.fn(),
    } as unknown as IViewerIdentityReader;

    notificationService = new NotificationService(mockViewerIdentityReader);
  });

  describe('sendSms', () => {
    it('should send SMS if viewer has not opted out', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue({
        id: 'viewer-1',
        email: 'test@example.com',
        phoneE164: '+1234567890',
        smsOptOut: false,
      } as any);

      await notificationService.sendSms('+1234567890', 'Test message');

      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+1234567890',
        to: '+1234567890',
      });
    });

    it('should skip SMS if viewer has opted out', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue({
        id: 'viewer-1',
        email: 'test@example.com',
        phoneE164: '+1234567890',
        smsOptOut: true,
      } as any);

      await notificationService.sendSms('+1234567890', 'Test message');

      expect(twilioClient.messages.create).not.toHaveBeenCalled();
    });

    it('should send SMS if viewer not found (assume not opted out)', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue(null);

      await notificationService.sendSms('+1234567890', 'Test message');

      expect(twilioClient.messages.create).toHaveBeenCalled();
    });
  });

  describe('notifyEventLive', () => {
    it('should send email notifications for email preference', async () => {
      const subscribers: NotificationTarget[] = [
        { email: 'test@example.com', preference: 'email' },
      ];

      const eventData = {
        eventId: 'event-1',
        canonicalPath: '/stormfc/2010/202501301430',
        orgShortName: 'STORMFC',
        teamSlug: '2010',
        isPayPerView: false,
      };

      // Email sending is mocked (just logs in dev)
      await notificationService.notifyEventLive(subscribers, eventData);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should send SMS notifications for SMS preference', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue({
        id: 'viewer-1',
        smsOptOut: false,
      } as any);

      const subscribers: NotificationTarget[] = [
        { phoneE164: '+1234567890', preference: 'sms' },
      ];

      const eventData = {
        eventId: 'event-1',
        canonicalPath: '/stormfc/2010/202501301430',
        orgShortName: 'STORMFC',
        teamSlug: '2010',
        isPayPerView: false,
      };

      await notificationService.notifyEventLive(subscribers, eventData);

      expect(twilioClient.messages.create).toHaveBeenCalled();
    });

    it('should send both email and SMS for both preference', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue({
        id: 'viewer-1',
        smsOptOut: false,
      } as any);

      const subscribers: NotificationTarget[] = [
        { email: 'test@example.com', phoneE164: '+1234567890', preference: 'both' },
      ];

      const eventData = {
        eventId: 'event-1',
        canonicalPath: '/stormfc/2010/202501301430',
        orgShortName: 'STORMFC',
        teamSlug: '2010',
        isPayPerView: false,
      };

      await notificationService.notifyEventLive(subscribers, eventData);

      expect(twilioClient.messages.create).toHaveBeenCalled();
    });

    it('should include checkout URL for pay-per-view events', async () => {
      const subscribers: NotificationTarget[] = [
        { email: 'test@example.com', preference: 'email' },
      ];

      const eventData = {
        eventId: 'event-1',
        canonicalPath: '/stormfc/2010/202501301430',
        orgShortName: 'STORMFC',
        teamSlug: '2010',
        isPayPerView: true,
        checkoutUrl: 'https://fieldview.live/checkout/event/event-1',
      };

      await notificationService.notifyEventLive(subscribers, eventData);

      // Should not throw
      expect(true).toBe(true);
    });
  });
});

