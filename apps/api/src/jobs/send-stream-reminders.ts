/**
 * Stream Reminder Cron Job
 * Sends email reminders to viewers before scheduled streams
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sendEmail, renderReminderEmail } from '../lib/email';

/**
 * Send reminders for upcoming streams
 * This should be run every minute via cron
 */
export async function sendStreamReminders(): Promise<void> {
  const now = new Date();
  
  try {
    // Find streams that:
    // 1. Have a scheduled start time
    // 2. Haven't sent reminders yet
    // 3. Have reminders enabled
    // 4. Are within the reminder window (now + reminderMinutes)
    const upcomingStreams = await prisma.directStream.findMany({
      where: {
        scheduledStartAt: {
          gte: now,
          lte: new Date(now.getTime() + 15 * 60 * 1000), // Next 15 minutes
        },
        reminderSentAt: null,
        sendReminders: true,
      },
      include: {
        game: true,
      },
    });

    logger.info({ 
      streamCount: upcomingStreams.length,
      timestamp: now.toISOString(),
    }, 'Checking for streams needing reminders');

    for (const stream of upcomingStreams) {
      // Calculate when to send the reminder
      const reminderTime = new Date(
        stream.scheduledStartAt!.getTime() - (stream.reminderMinutes * 60 * 1000)
      );

      // Check if it's time to send (within 2 minute window, allowing for slight delays)
      const timeDiff = reminderTime.getTime() - now.getTime();
      const shouldSend = timeDiff >= -30 * 1000 && timeDiff < 90 * 1000; // -30s to +90s window

      if (!shouldSend) {
        continue;
      }

      await sendRemindersForStream(stream);
    }
  } catch (error) {
    logger.error({ error }, 'Stream reminder job failed');
  }
}

/**
 * Send reminder emails for a specific stream
 */
async function sendRemindersForStream(stream: any): Promise<void> {
  if (!stream.gameId) {
    logger.info({ slug: stream.slug }, 'No game linked to stream, skipping reminders');
    return;
  }

  // Get viewers who want reminders for this game
  const viewers = await prisma.viewerIdentity.findMany({
    where: {
      wantsReminders: true,
    },
  });
  
  if (viewers.length === 0) {
    logger.info({ slug: stream.slug }, 'No viewers to send reminders to');
    return;
  }

  logger.info(
    { 
      slug: stream.slug,
      recipientCount: viewers.length,
      scheduledStartAt: stream.scheduledStartAt,
    },
    'Sending stream reminders'
  );

  const streamUrl = `${process.env.WEB_URL || 'http://localhost:4300'}/direct/${stream.slug}`;

  let successCount = 0;
  let failureCount = 0;

  for (const viewer of viewers) {
    try {
      const html = renderReminderEmail({
        firstName: viewer.firstName || 'Viewer',
        streamTitle: stream.title,
        streamUrl,
        reminderMinutes: stream.reminderMinutes,
        scheduledStartAt: stream.scheduledStartAt!,
      });

      await sendEmail({
        to: viewer.email,
        subject: `🔴 Starting in ${stream.reminderMinutes} minutes: ${stream.title}`,
        html,
      });
      successCount++;
    } catch (error) {
      logger.error({ error, email: viewer.email }, 'Failed to send reminder to viewer');
      failureCount++;
    }
  }

  // Mark reminder as sent
  await prisma.directStream.update({
    where: { id: stream.id },
    data: { reminderSentAt: new Date() },
  });

  logger.info(
    {
      slug: stream.slug,
      successCount,
      failureCount,
      totalRecipients: viewers.length,
    },
    'Stream reminders sent'
  );
}

