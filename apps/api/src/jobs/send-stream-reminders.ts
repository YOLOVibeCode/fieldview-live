/**
 * Stream Reminder Cron Job
 *
 * Delegates to the ISP-based StreamReminderService for sending
 * email reminders to viewers before scheduled streams.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getEmailProvider } from '../lib/email';
import { createStreamReminderService } from '../services/stream-reminder.implementations';

const service = createStreamReminderService(prisma, getEmailProvider());

/**
 * Send reminders for upcoming streams.
 * Called every minute via cron.
 */
export async function sendStreamReminders(): Promise<void> {
  try {
    const count = await service.sendDueReminders();
    if (count > 0) {
      logger.info({ streamCount: count }, 'Stream reminders sent');
    }
  } catch (error) {
    logger.error({ error }, 'Stream reminder job failed');
  }
}
