/**
 * Owner DirectStream Prisma Repository Implementation
 *
 * Implements IOwnerDirectStreamReader and IOwnerDirectStreamWriter using Prisma ORM.
 * All read operations are scoped to an owner account for security.
 */

import type { PrismaClient, DirectStream } from '@prisma/client';
import type {
  IOwnerDirectStreamReader,
  IOwnerDirectStreamWriter,
  ICreateOwnerDirectStreamInput,
  IUpdateOwnerDirectStreamInput,
  IListOwnerDirectStreamsFilters,
  IOwnerDirectStreamSummary,
} from './IOwnerDirectStreamRepository';

export class OwnerDirectStreamRepository
  implements IOwnerDirectStreamReader, IOwnerDirectStreamWriter
{
  constructor(private prisma: PrismaClient) {}

  // ==================== READER METHODS ====================

  async getByIdForOwner(id: string, ownerAccountId: string): Promise<DirectStream | null> {
    return this.prisma.directStream.findFirst({
      where: { id, ownerAccountId },
    });
  }

  async getBySlugForOwner(slug: string, ownerAccountId: string): Promise<DirectStream | null> {
    return this.prisma.directStream.findFirst({
      where: { slug, ownerAccountId },
    });
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.prisma.directStream.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !existing;
  }

  async listForOwner(filters: IListOwnerDirectStreamsFilters): Promise<IOwnerDirectStreamSummary[]> {
    const { ownerAccountId, status = 'active', sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Record<string, unknown> = { ownerAccountId };
    if (status !== 'all') {
      where.status = status;
    }

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const streams = await this.prisma.directStream.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            events: true,
            registrations: true,
          },
        },
      },
    });

    return streams.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      streamUrl: s.streamUrl,
      scheduledStartAt: s.scheduledStartAt,
      status: s.status,
      paywallEnabled: s.paywallEnabled,
      priceInCents: s.priceInCents,
      chatEnabled: s.chatEnabled,
      scoreboardEnabled: s.scoreboardEnabled,
      listed: s.listed,
      eventsCount: s._count.events,
      registrationsCount: s._count.registrations,
      createdAt: s.createdAt,
    }));
  }

  // ==================== WRITER METHODS ====================

  async create(input: ICreateOwnerDirectStreamInput): Promise<DirectStream> {
    return this.prisma.directStream.create({
      data: {
        ownerAccountId: input.ownerAccountId,
        slug: input.slug,
        title: input.title,
        streamUrl: input.streamUrl,
        scheduledStartAt: input.scheduledStartAt,
        adminPassword: input.adminPassword,
        chatEnabled: input.chatEnabled ?? true,
        scoreboardEnabled: input.scoreboardEnabled ?? false,
        paywallEnabled: input.paywallEnabled ?? false,
        priceInCents: input.priceInCents ?? 0,
        paywallMessage: input.paywallMessage,
        allowAnonymousView: input.allowAnonymousView ?? true,
        requireEmailVerification: input.requireEmailVerification ?? true,
        listed: input.listed ?? true,
        scoreboardHomeTeam: input.scoreboardHomeTeam,
        scoreboardAwayTeam: input.scoreboardAwayTeam,
        scoreboardHomeColor: input.scoreboardHomeColor,
        scoreboardAwayColor: input.scoreboardAwayColor,
      },
    });
  }

  async update(id: string, input: IUpdateOwnerDirectStreamInput): Promise<DirectStream> {
    return this.prisma.directStream.update({
      where: { id },
      data: input,
    });
  }

  async archive(id: string): Promise<DirectStream> {
    return this.prisma.directStream.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });
  }
}
