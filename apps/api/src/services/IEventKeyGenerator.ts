/**
 * Event Key Generator Interface (ISP)
 *
 * Single responsibility: generate unique URL keys for events.
 */

export interface IEventKeyGenerator {
  /**
   * Generate URL key from start datetime (YYYYMMDDHHmm format).
   */
  generateUrlKey(startsAt: Date, format?: 'YYYYMMDDHHmm'): string;

  /**
   * Ensure unique key by checking for collisions and appending suffix if needed.
   * Returns the final unique key.
   */
  ensureUniqueKey(channelId: string, urlKeyBase: string): Promise<string>;
}


