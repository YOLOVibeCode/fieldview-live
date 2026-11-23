/**
 * Persist matched live stream URLs to DirectStreamEvent via Prisma.
 *
 * Each write is guarded on the URL the candidate was read with and on no pin, so
 * a URL a person set between the read and the write is never overwritten. Such a
 * page counts as skipped. The poller's own writes set no pin.
 */

import type { PrismaClient } from '@prisma/client';

import type { IStreamUrlUpdater, StreamMatch, UpdateResult } from '../interfaces';

export class PrismaStreamUpdater implements IStreamUrlUpdater {
  constructor(private prisma: PrismaClient) {}

  async updateStreamUrls(matches: StreamMatch[]): Promise<UpdateResult> {
    const details: UpdateResult['details'] = [];
    let updated = 0;
    let skipped = 0;

    for (const { stream, event, confidence } of matches) {
      const newUrl = stream.streamUrl;
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

      const written = await this.prisma.directStreamEvent.updateMany({
        where: { id: event.eventId, streamUrl: oldUrl, streamUrlPinnedAt: null },
        data: { streamUrl: newUrl },
      });
      if (written.count === 0) {
        skipped += 1;
        continue;
      }
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
