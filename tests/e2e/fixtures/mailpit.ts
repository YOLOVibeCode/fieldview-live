/**
 * Mailpit Test Helper
 *
 * Utilities for verifying email notifications in E2E tests.
 * Mailpit provides an API at http://localhost:4305/api/v1
 *
 * @see https://mailpit.axllent.org/docs/api-v1/
 */

import type { APIRequestContext } from '@playwright/test';

const MAILPIT_API = process.env.MAILPIT_API_URL || 'http://localhost:4304';

export interface MailpitMessage {
  ID: string;
  MessageID: string;
  Read: boolean;
  From: {
    Name: string;
    Address: string;
  };
  To: Array<{
    Name: string;
    Address: string;
  }>;
  Cc: Array<{
    Name: string;
    Address: string;
  }>;
  Bcc: Array<{
    Name: string;
    Address: string;
  }>;
  Subject: string;
  Date: string;
  Text: string;
  HTML: string;
  Size: number;
  Attachments: number;
}

export interface MailpitSearchResult {
  total: number;
  unread: number;
  count: number;
  messages: MailpitMessage[];
  start: number;
}

/**
 * Mailpit helper class for E2E email testing
 */
export class MailpitHelper {
  constructor(private request: APIRequestContext) {}

  /**
   * Get all messages (newest first)
   */
  async getMessages(limit = 50): Promise<MailpitMessage[]> {
    const response = await this.request.get(`${MAILPIT_API}/api/v1/messages`, {
      params: { limit: limit.toString() },
    });

    if (!response.ok()) {
      throw new Error(`Mailpit API error: ${response.status()}`);
    }

    const data: MailpitSearchResult = await response.json();
    return data.messages || [];
  }

  /**
   * Search for messages by query
   * Query syntax: https://mailpit.axllent.org/docs/usage/search-filters/
   *
   * Examples:
   *   - to:user@example.com
   *   - subject:"Welcome"
   *   - from:noreply@fieldview.live
   */
  async search(query: string): Promise<MailpitMessage[]> {
    const response = await this.request.get(`${MAILPIT_API}/api/v1/search`, {
      params: { query },
    });

    if (!response.ok()) {
      throw new Error(`Mailpit search error: ${response.status()}`);
    }

    const data: MailpitSearchResult = await response.json();
    return data.messages || [];
  }

  /**
   * Get a single message by ID
   */
  async getMessage(id: string): Promise<MailpitMessage> {
    const response = await this.request.get(`${MAILPIT_API}/api/v1/message/${id}`);

    if (!response.ok()) {
      throw new Error(`Mailpit message not found: ${id}`);
    }

    return response.json();
  }

  /**
   * Get HTML content of a message
   */
  async getMessageHtml(id: string): Promise<string> {
    const response = await this.request.get(`${MAILPIT_API}/api/v1/message/${id}/html`);

    if (!response.ok()) {
      throw new Error(`Mailpit HTML not found: ${id}`);
    }

    return response.text();
  }

  /**
   * Get plain text content of a message
   */
  async getMessageText(id: string): Promise<string> {
    const response = await this.request.get(`${MAILPIT_API}/api/v1/message/${id}/text`);

    if (!response.ok()) {
      throw new Error(`Mailpit text not found: ${id}`);
    }

    return response.text();
  }

  /**
   * Delete all messages (clear inbox)
   */
  async deleteAll(): Promise<void> {
    const response = await this.request.delete(`${MAILPIT_API}/api/v1/messages`);

    if (!response.ok()) {
      throw new Error(`Mailpit delete error: ${response.status()}`);
    }
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(id: string): Promise<void> {
    const response = await this.request.delete(`${MAILPIT_API}/api/v1/messages`, {
      data: { IDs: [id] },
    });

    if (!response.ok()) {
      throw new Error(`Mailpit delete error: ${response.status()}`);
    }
  }

  /**
   * Wait for an email to arrive (with polling)
   */
  async waitForEmail(
    options: {
      to?: string;
      subject?: string;
      from?: string;
      timeout?: number;
      pollInterval?: number;
    }
  ): Promise<MailpitMessage | null> {
    const {
      to,
      subject,
      from,
      timeout = 30000,
      pollInterval = 1000,
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let query = '';
      if (to) query += `to:${to} `;
      if (subject) query += `subject:"${subject}" `;
      if (from) query += `from:${from} `;

      const messages = query.trim()
        ? await this.search(query.trim())
        : await this.getMessages(1);

      if (messages.length > 0) {
        return messages[0];
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return null;
  }

  /**
   * Verify email was sent to recipient
   */
  async verifyEmailSent(to: string, subjectContains?: string): Promise<boolean> {
    const messages = await this.search(`to:${to}`);

    if (messages.length === 0) {
      return false;
    }

    if (subjectContains) {
      return messages.some((m) =>
        m.Subject.toLowerCase().includes(subjectContains.toLowerCase())
      );
    }

    return true;
  }

  /**
   * Get count of messages for recipient
   */
  async getEmailCount(to: string): Promise<number> {
    const messages = await this.search(`to:${to}`);
    return messages.length;
  }

  /**
   * Extract links from email HTML
   */
  async extractLinks(messageId: string): Promise<string[]> {
    const html = await this.getMessageHtml(messageId);
    const linkRegex = /href="([^"]+)"/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      if (match[1] && !match[1].startsWith('mailto:')) {
        links.push(match[1]);
      }
    }

    return links;
  }

  /**
   * Check if Mailpit is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.request.get(`${MAILPIT_API}/api/v1/info`);
      return response.ok();
    } catch {
      return false;
    }
  }
}

/**
 * Expected email templates for FieldView.Live
 */
export const EmailTemplates = {
  WELCOME: {
    subject: 'Welcome to FieldView.Live',
    from: 'noreply@fieldview.live',
  },
  STREAM_CREATED: {
    subject: 'Stream Created',
    from: 'noreply@fieldview.live',
  },
  PAYMENT_CONFIRMED: {
    subject: 'Payment Confirmed',
    from: 'noreply@fieldview.live',
  },
  STREAM_REMINDER: {
    subject: 'Your stream is starting soon',
    from: 'noreply@fieldview.live',
  },
  SUBSCRIPTION_CONFIRMED: {
    subject: 'Subscription Confirmed',
    from: 'noreply@fieldview.live',
  },
  ABUSE_WARNING: {
    subject: 'Account Notice',
    from: 'noreply@fieldview.live',
  },
};
