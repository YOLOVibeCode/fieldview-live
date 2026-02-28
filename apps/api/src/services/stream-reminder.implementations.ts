/**
 * Concrete Prisma Implementations of Stream Reminder Interfaces
 *
 * Adapts Prisma to the ISP interfaces for the reminder cron job.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  IStreamReminderReader,
  IReminderRecipientReader,
  IStreamReminderWriter,
  StreamReminderCandidate,
  ReminderRecipient,
} from './stream-reminder.interfaces';
import { StreamReminderService } from './stream-reminder.service';
import type { IEmailProvider } from '../lib/email/IEmailProvider';

export class PrismaStreamReminderReader implements IStreamReminderReader {
  constructor(private prisma: PrismaClient) {}

  async findStreamsNeedingReminders(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<StreamReminderCandidate[]> {
    const streams = await this.prisma.directStream.findMany({
      where: {
        scheduledStartAt: { gte: windowStart, lte: windowEnd },
        reminderSentAt: null,
        sendReminders: true,
        status: 'active',
      },
    });

    return streams.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      scheduledStartAt: s.scheduledStartAt!,
      reminderMinutes: s.reminderMinutes,
      streamUrl: s.streamUrl,
    }));
  }
}

export class PrismaReminderRecipientReader implements IReminderRecipientReader {
  constructor(private prisma: PrismaClient) {}

  async getRecipients(streamId: string): Promise<ReminderRecipient[]> {
    const registrations = await this.prisma.directStreamRegistration.findMany({
      where: {
        directStreamId: streamId,
        wantsReminders: true,
      },
      include: {
        viewerIdentity: true,
      },
    });

    return registrations
      .filter((r) => r.viewerIdentity.email && !r.viewerIdentity.email.includes('@guest.fieldview.live'))
      .map((r) => ({
        viewerId: r.viewerIdentityId,
        email: r.viewerIdentity.email,
        firstName: r.viewerIdentity.firstName,
      }));
  }
}

export class PrismaStreamReminderWriter implements IStreamReminderWriter {
  constructor(private prisma: PrismaClient) {}

  async markReminderSent(streamId: string, sentAt: Date): Promise<void> {
    await this.prisma.directStream.update({
      where: { id: streamId },
      data: { reminderSentAt: sentAt },
    });
  }
}

/**
 * Factory: create a fully-wired StreamReminderService
 */
export function createStreamReminderService(
  prisma: PrismaClient,
  emailProvider: IEmailProvider,
): StreamReminderService {
  return new StreamReminderService(
    new PrismaStreamReminderReader(prisma),
    new PrismaReminderRecipientReader(prisma),
    new PrismaStreamReminderWriter(prisma),
    emailProvider,
  );
}
