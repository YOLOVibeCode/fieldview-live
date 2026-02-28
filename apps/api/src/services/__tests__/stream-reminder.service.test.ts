/**
 * StreamReminderService Tests (TDD — RED phase)
 *
 * Tests the orchestration logic: find due streams → get recipients → send emails → mark sent.
 * All dependencies are mocked via ISP interfaces.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamReminderService } from '../stream-reminder.service';
import type {
  IStreamReminderReader,
  IReminderRecipientReader,
  IStreamReminderWriter,
  StreamReminderCandidate,
  ReminderRecipient,
} from '../stream-reminder.interfaces';
import type { IEmailProvider } from '../../lib/email/IEmailProvider';

describe('StreamReminderService (TDD)', () => {
  let service: StreamReminderService;
  let mockStreamReader: IStreamReminderReader;
  let mockRecipientReader: IReminderRecipientReader;
  let mockStreamWriter: IStreamReminderWriter;
  let mockEmailProvider: IEmailProvider;

  const now = new Date('2026-02-25T19:00:00Z');

  const mockStream: StreamReminderCandidate = {
    id: 'stream-1',
    slug: 'tchs',
    title: 'TCHS Live Stream',
    scheduledStartAt: new Date('2026-02-25T19:05:00Z'),
    reminderMinutes: 5,
    streamUrl: 'https://stream.mux.com/abc123',
  };

  const mockRecipients: ReminderRecipient[] = [
    { viewerId: 'v-1', email: 'alice@example.com', firstName: 'Alice' },
    { viewerId: 'v-2', email: 'bob@example.com', firstName: 'Bob' },
    { viewerId: 'v-3', email: 'carol@example.com', firstName: null },
  ];

  beforeEach(() => {
    mockStreamReader = {
      findStreamsNeedingReminders: vi.fn().mockResolvedValue([]),
    };

    mockRecipientReader = {
      getRecipients: vi.fn().mockResolvedValue([]),
    };

    mockStreamWriter = {
      markReminderSent: vi.fn().mockResolvedValue(undefined),
    };

    mockEmailProvider = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };

    service = new StreamReminderService(
      mockStreamReader,
      mockRecipientReader,
      mockStreamWriter,
      mockEmailProvider,
    );
  });

  describe('sendDueReminders', () => {
    it('should return 0 when no streams need reminders', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([]);

      const count = await service.sendDueReminders();

      expect(count).toBe(0);
      expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      expect(mockStreamWriter.markReminderSent).not.toHaveBeenCalled();
    });

    it('should send emails to all recipients for a due stream', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue(mockRecipients);

      const count = await service.sendDueReminders();

      expect(count).toBe(1);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(3);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@example.com' }),
      );
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'bob@example.com' }),
      );
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'carol@example.com' }),
      );
    });

    it('should mark stream as reminder-sent after sending', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue(mockRecipients);

      await service.sendDueReminders();

      expect(mockStreamWriter.markReminderSent).toHaveBeenCalledWith(
        'stream-1',
        expect.any(Date),
      );
    });

    it('should handle zero recipients gracefully and still mark sent', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue([]);

      const count = await service.sendDueReminders();

      expect(count).toBe(1);
      expect(mockEmailProvider.sendEmail).not.toHaveBeenCalled();
      expect(mockStreamWriter.markReminderSent).toHaveBeenCalledWith(
        'stream-1',
        expect.any(Date),
      );
    });

    it('should continue sending to other recipients when one email fails', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue(mockRecipients);
      vi.mocked(mockEmailProvider.sendEmail)
        .mockResolvedValueOnce(undefined) // alice OK
        .mockRejectedValueOnce(new Error('SMTP error')) // bob fails
        .mockResolvedValueOnce(undefined); // carol OK

      const count = await service.sendDueReminders();

      expect(count).toBe(1);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(3);
      // Stream should still be marked sent despite partial failure
      expect(mockStreamWriter.markReminderSent).toHaveBeenCalled();
    });

    it('should process multiple streams independently', async () => {
      const stream2: StreamReminderCandidate = {
        id: 'stream-2',
        slug: 'game2',
        title: 'Game 2 Stream',
        scheduledStartAt: new Date('2026-02-25T19:10:00Z'),
        reminderMinutes: 10,
        streamUrl: null,
      };

      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream, stream2]);
      vi.mocked(mockRecipientReader.getRecipients)
        .mockResolvedValueOnce(mockRecipients) // stream-1: 3 recipients
        .mockResolvedValueOnce([mockRecipients[0]]); // stream-2: 1 recipient

      const count = await service.sendDueReminders();

      expect(count).toBe(2);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(4); // 3 + 1
      expect(mockStreamWriter.markReminderSent).toHaveBeenCalledTimes(2);
    });

    it('should include stream title in email subject', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue([mockRecipients[0]]);

      await service.sendDueReminders();

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('TCHS Live Stream'),
        }),
      );
    });

    it('should include HTML content in email', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue([mockRecipients[0]]);

      await service.sendDueReminders();

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
        }),
      );
    });

    it('should not mark stream as sent if all emails fail', async () => {
      vi.mocked(mockStreamReader.findStreamsNeedingReminders).mockResolvedValue([mockStream]);
      vi.mocked(mockRecipientReader.getRecipients).mockResolvedValue(mockRecipients);
      vi.mocked(mockEmailProvider.sendEmail).mockRejectedValue(new Error('All fail'));

      const count = await service.sendDueReminders();

      // Stream still counts as processed, but we may choose not to mark it
      // The important thing is the service doesn't throw
      expect(count).toBe(0);
      expect(mockStreamWriter.markReminderSent).not.toHaveBeenCalled();
    });
  });
});
