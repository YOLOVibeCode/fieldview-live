/**
 * Load DirectStreamEvent candidates for an owner account (for Veo fuzzy matching).
 */

import type { PrismaClient } from '@prisma/client';
import type { IVeoCandidateReader, MatchCandidate } from '../interfaces';

export class PrismaVeoCandidateReader implements IVeoCandidateReader {
  constructor(private prisma: PrismaClient) {}

  async getCandidates(ownerAccountId: string): Promise<MatchCandidate[]> {
    const events = await this.prisma.directStreamEvent.findMany({
      where: {
        directStream: { ownerAccountId },
        status: 'active',
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
