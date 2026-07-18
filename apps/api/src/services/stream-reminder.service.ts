/**
 * StreamReminderService
 *
 * Orchestrates the reminder sending flow:
 * 1. Find streams needing reminders (within a time window)
 * 2. Get recipients for each stream
 * 3. Send reminder emails (tolerating individual failures)
 * 4. Mark streams as reminder-sent (only if at least one email succeeded)
 */

import type {
  IStreamReminderService,
  IStreamReminderReader,
  IReminderRecipientReader,
  IStreamReminderWriter,
  StreamReminderCandidate,
  ReminderRecipient,
} from './stream-reminder.interfaces';
import type { IEmailProvider } from '../lib/email/IEmailProvider';

/** Default look-ahead window in minutes */
const WINDOW_MINUTES = 15;

export class StreamReminderService implements IStreamReminderService {
  constructor(
    private readonly streamReader: IStreamReminderReader,
    private readonly recipientReader: IReminderRecipientReader,
    private readonly streamWriter: IStreamReminderWriter,
    private readonly emailProvider: IEmailProvider,
  ) {}

  async sendDueReminders(): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60_000);

    const streams = await this.streamReader.findStreamsNeedingReminders(now, windowEnd);

    if (streams.length === 0) {
      return 0;
    }

    let sentCount = 0;

    for (const stream of streams) {
      const success = await this.processStream(stream);
      if (success) {
        sentCount++;
      }
    }

    return sentCount;
  }

  private async processStream(stream: StreamReminderCandidate): Promise<boolean> {
    const recipients = await this.recipientReader.getRecipients(stream.id);

    // Zero recipients — nothing to send, but mark as handled
    if (recipients.length === 0) {
      await this.streamWriter.markReminderSent(stream.id, new Date());
      return true;
    }

    // Send emails, tolerating individual failures
    let anySuccess = false;

    for (const recipient of recipients) {
      try {
        await this.sendReminderEmail(stream, recipient);
        anySuccess = true;
      } catch {
        // Individual failure — continue to next recipient
      }
    }

    // Only mark sent if at least one email succeeded
    if (anySuccess) {
      await this.streamWriter.markReminderSent(stream.id, new Date());
    }

    return anySuccess;
  }

  private async sendReminderEmail(
    stream: StreamReminderCandidate,
    recipient: ReminderRecipient,
  ): Promise<void> {
    const name = recipient.firstName || 'there';
    const streamUrl = stream.streamUrl || `https://fieldview.live/direct/${stream.slug}`;

    const subject = `${stream.title} is starting soon!`;
    const html = this.buildReminderHtml(name, stream.title, streamUrl, stream.reminderMinutes, stream.scheduledStartAt);

    await this.emailProvider.sendEmail({
      to: recipient.email,
      subject,
      html,
    });
  }

  private buildReminderHtml(
    name: string,
    title: string,
    streamUrl: string,
    minutes: number,
    scheduledAt: Date,
  ): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:40px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:28px;">Starting in ${minutes} Minutes!</h1>
  </div>
  <div style="padding:40px 30px;">
    <p style="font-size:18px;color:#111827;">Hi ${name},</p>
    <p style="font-size:20px;color:#dc2626;font-weight:600;">${title} is starting in ${minutes} minutes!</p>
    <div style="text-align:center;margin:35px 0;">
      <a href="${streamUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:18px 60px;text-decoration:none;border-radius:8px;font-size:20px;font-weight:700;">JOIN STREAM NOW</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:14px;color:#6b7280;">FieldView.Live</p>
  </div>
</div>
</body>
</html>`;
  }
}
