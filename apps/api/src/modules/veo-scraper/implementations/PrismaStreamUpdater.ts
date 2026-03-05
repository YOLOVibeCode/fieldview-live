/**
 * Persist matched Veo stream URLs to DirectStreamEvent via Prisma.
 */

import type { PrismaClient } from '@prisma/client';
import type { IVeoStreamUpdater, StreamMatch, UpdateResult } from '../interfaces';

export class PrismaStreamUpdater implements IVeoStreamUpdater {
  constructor(private prisma: PrismaClient) {}

  async updateStreamUrls(matches: StreamMatch[]): Promise<UpdateResult> {
    const details: UpdateResult['details'] = [];
    let updated = 0;
    let skipped = 0;

    for (const { veoRow, event, confidence } of matches) {
      const newUrl = veoRow.streamUrl ?? '';
      const oldUrl = event.currentStreamUrl ?? null;

      if (oldUrl === newUrl) {
        skipped += 1;
        details.push({
          eventSlug: event.eventSlug,
          oldUrl,
          newUrl,
          confidence,
        });
        continue;
      }

      await this.prisma.directStreamEvent.update({
        where: { id: event.eventId },
        data: { streamUrl: newUrl },
      });
      updated += 1;
      details.push({
        eventSlug: event.eventSlug,
        oldUrl,
        newUrl,
        confidence,
      });
    }

    return { updated, skipped, details };
  }
}
