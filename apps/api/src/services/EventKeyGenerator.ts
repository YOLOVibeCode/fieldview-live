/**
 * Event Key Generator
 *
 * Generates unique URL keys for events from datetime.
 */

import type { IEventReaderRepo } from '../repositories/IEventRepository';

import type { IEventKeyGenerator } from './IEventKeyGenerator';

export class EventKeyGenerator implements IEventKeyGenerator {
  constructor(private eventReader: IEventReaderRepo) {}

  generateUrlKey(startsAt: Date, _format: 'YYYYMMDDHHmm' = 'YYYYMMDDHHmm'): string {
    // Use UTC to avoid timezone issues (coach selects local time, but we store as-is)
    const year = startsAt.getUTCFullYear();
    const month = String(startsAt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(startsAt.getUTCDate()).padStart(2, '0');
    const hour = String(startsAt.getUTCHours()).padStart(2, '0');
    const minute = String(startsAt.getUTCMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}`;
  }

  async ensureUniqueKey(channelId: string, urlKeyBase: string): Promise<string> {
    let candidate = urlKeyBase;
    let suffix = 2;

    // Check for collision using count method (more efficient)
    const count = await this.eventReader.countEventsByChannelIdAndUrlKey(channelId, candidate);
    if (count === 0) {
      return candidate;
    }

    // Append suffix until unique
    while (true) {
      candidate = `${urlKeyBase}-${suffix}`;
      const collisionCount = await this.eventReader.countEventsByChannelIdAndUrlKey(channelId, candidate);
      if (collisionCount === 0) {
        return candidate;
      }
      suffix++;
      if (suffix > 999) {
        throw new Error('Unable to generate unique URL key after 999 attempts');
      }
    }
  }
}

