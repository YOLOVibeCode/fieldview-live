/**
 * Coach text commands: the account's game pages, on Prisma.
 *
 * Every read is scoped to the account and to active pages under active parents.
 * Pages with no start time are never offered: nothing says when they are on.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

import type { CoachGame, IGameReader } from '../interfaces';

const HOUR_MS = 60 * 60 * 1000;

/** A game started up to this long ago is still on. */
export const ON_NOW_BEFORE_MS = 3 * HOUR_MS;
/** A game starting within this is already on, for a coach setting up the camera. */
export const ON_NOW_AFTER_MS = 60 * 60 * 1000;

const SELECT = {
  id: true,
  directStreamId: true,
  title: true,
  eventSlug: true,
  scheduledStartAt: true,
  streamUrl: true,
  directStream: { select: { slug: true } },
} satisfies Prisma.DirectStreamEventSelect;

type GameRow = Prisma.DirectStreamEventGetPayload<{ select: typeof SELECT }>;

function toGame(row: GameRow): CoachGame {
  return {
    eventId: row.id,
    directStreamId: row.directStreamId,
    title: row.title,
    parentSlug: row.directStream.slug,
    eventSlug: row.eventSlug,
    scheduledStartAt: row.scheduledStartAt,
    streamUrl: row.streamUrl,
  };
}

function ofAccount(ownerAccountId: string): Prisma.DirectStreamEventWhereInput {
  return { status: 'active', directStream: { ownerAccountId, status: 'active' } };
}

export class PrismaGameReader implements IGameReader {
  constructor(private readonly prisma: PrismaClient) {}

  async listOnNow(ownerAccountId: string, now: Date): Promise<CoachGame[]> {
    const rows = await this.prisma.directStreamEvent.findMany({
      where: {
        ...ofAccount(ownerAccountId),
        scheduledStartAt: {
          gte: new Date(now.getTime() - ON_NOW_BEFORE_MS),
          lte: new Date(now.getTime() + ON_NOW_AFTER_MS),
        },
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
      take: 20,
      select: SELECT,
    });
    return rows.map(toGame);
  }

  async listUpcoming(ownerAccountId: string, now: Date, hours: number, limit: number): Promise<CoachGame[]> {
    const rows = await this.prisma.directStreamEvent.findMany({
      where: {
        ...ofAccount(ownerAccountId),
        scheduledStartAt: {
          gte: new Date(now.getTime() - ON_NOW_BEFORE_MS),
          lte: new Date(now.getTime() + hours * HOUR_MS),
        },
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: SELECT,
    });
    return rows.map(toGame);
  }

  async listNearest(ownerAccountId: string, now: Date, limit: number): Promise<CoachGame[]> {
    const [ahead, behind] = await Promise.all([
      this.prisma.directStreamEvent.findMany({
        where: { ...ofAccount(ownerAccountId), scheduledStartAt: { gte: now } },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
        take: limit,
        select: SELECT,
      }),
      this.prisma.directStreamEvent.findMany({
        where: { ...ofAccount(ownerAccountId), scheduledStartAt: { lt: now } },
        orderBy: [{ scheduledStartAt: 'desc' }, { id: 'asc' }],
        take: limit,
        select: SELECT,
      }),
    ]);
    const distance = (row: GameRow): number =>
      Math.abs((row.scheduledStartAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - now.getTime());
    return [...ahead, ...behind]
      .sort((a, b) => distance(a) - distance(b))
      .slice(0, limit)
      .map(toGame);
  }
}
