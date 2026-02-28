/**
 * Stream Reminder Service Interfaces (ISP)
 *
 * Segregated interfaces for the stream reminder cron job.
 * Reader interfaces handle queries, writer interface handles mutations.
 */

/**
 * A stream that is a candidate for sending reminders
 */
export interface StreamReminderCandidate {
  id: string;
  slug: string;
  title: string;
  scheduledStartAt: Date;
  reminderMinutes: number;
  streamUrl: string | null;
}

/**
 * A viewer who should receive a reminder email
 */
export interface ReminderRecipient {
  viewerId: string;
  email: string;
  firstName: string | null;
}

/**
 * Data passed to the email template
 */
export interface ReminderEmailData {
  streamTitle: string;
  streamSlug: string;
  scheduledStartAt: Date;
  streamUrl: string | null;
}

// ========================================
// Reader interfaces (query-only)
// ========================================

/**
 * Reads streams that are eligible for reminders
 */
export interface IStreamReminderReader {
  /**
   * Find streams with scheduledStartAt within the given window
   * that haven't sent reminders yet and have reminders enabled.
   */
  findStreamsNeedingReminders(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<StreamReminderCandidate[]>;
}

/**
 * Reads viewers who want reminders for a specific stream
 */
export interface IReminderRecipientReader {
  /**
   * Get all viewers registered for a stream who want reminders
   * and have valid email addresses.
   */
  getRecipients(streamId: string): Promise<ReminderRecipient[]>;
}

// ========================================
// Writer interface (mutations)
// ========================================

/**
 * Marks streams as having sent reminders
 */
export interface IStreamReminderWriter {
  /**
   * Mark a stream's reminder as sent at the given timestamp.
   */
  markReminderSent(streamId: string, sentAt: Date): Promise<void>;
}

// ========================================
// Combined service interface
// ========================================

/**
 * Orchestrates the reminder sending process:
 * 1. Find streams needing reminders
 * 2. Get recipients for each stream
 * 3. Send reminder emails
 * 4. Mark streams as reminder-sent
 */
export interface IStreamReminderService {
  /**
   * Run the reminder check and send due reminders.
   * @returns Number of streams that had reminders sent
   */
  sendDueReminders(): Promise<number>;
}
