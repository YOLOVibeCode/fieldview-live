/**
 * Load DirectStreamEvent candidates for an owner account (for fuzzy matching).
 *
 * A page whose stream URL a person chose (the admin panel, a coach's text) is
 * pinned and is not a candidate: it stays until a person changes or clears it.
 */

import type { PrismaClient } from '@prisma/client';

import type { ICandidateReader, MatchCandidate } from '../interfaces';

export class PrismaCandidateReader implements ICandidateReader {
  constructor(private prisma: PrismaClient) {}

  async getCandidates(ownerAccountId: string): Promise<MatchCandidate[]> {
    const events = await this.prisma.directStreamEvent.findMany({
      where: {
        directStream: { ownerAccountId },
        status: 'active',
        streamUrlPinnedAt: null,
      },
      include: {
        directStream: { select: { slug: true } },
      },
    });

    return events.map((e) => ({
      eventId: e.id,
      eventSlug: e.eventSlug,
      title: e.title,
      directStreamSlug: e.directStream.slug,
      currentStreamUrl: e.streamUrl,
    }));
  }
}
