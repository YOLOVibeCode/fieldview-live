/**
 * Game Event Repository — Prisma implementation of ISP event interfaces.
 */

import type { PrismaClient } from '@prisma/client';
import type { TeamSide } from '@fieldview/data-model';
import type {
  GameEventStatus,
  IGameEventConfirmationWriter,
  IGameEventReader,
  IGameEventWriter,
  IStreamContextReader,
  StoredGameEvent,
  StreamContext,
} from '../../services/game-event.interfaces';

function mapEvent(
  row: {
    id: string;
    directStreamId: string;
    sport: string;
    eventType: string;
    team: string | null;
    pointsDelta: number;
    period: number | null;
    periodDetail: string | null;
    clockSeconds: number | null;
    reportedByViewerId: string;
    displayName: string;
    status: string;
    resolvedBy: string | null;
    chatMessageId: string | null;
    createdAt: Date;
    jerseyNumber: number | null;
    detail: string | null;
    detailValue: number | null;
    note: string | null;
    filmTimeSeconds: number | null;
    _count?: { confirmations: number };
    confirmations?: unknown[];
  }
): StoredGameEvent {
  const confirmationCount =
    row._count?.confirmations ??
    (Array.isArray(row.confirmations) ? row.confirmations.length : 0);
  return {
    id: row.id,
    directStreamId: row.directStreamId,
    sport: row.sport,
    eventType: row.eventType,
    team: (row.team as TeamSide | null) ?? null,
    pointsDelta: row.pointsDelta,
    period: row.period,
    periodDetail: row.periodDetail,
    clockSeconds: row.clockSeconds,
    reportedByViewerId: row.reportedByViewerId,
    displayName: row.displayName,
    status: row.status as StoredGameEvent['status'],
    resolvedBy: row.resolvedBy,
    chatMessageId: row.chatMessageId,
    createdAt: row.createdAt,
    confirmationCount,
    jerseyNumber: row.jerseyNumber,
    detail: row.detail,
    detailValue: row.detailValue,
    note: row.note,
    filmTimeSeconds: row.filmTimeSeconds,
  };
}

export class GameEventRepository
  implements IStreamContextReader, IGameEventReader, IGameEventWriter, IGameEventConfirmationWriter
{
  constructor(private prisma: PrismaClient) {}

  async getBySlug(slug: string): Promise<StreamContext | null> {
    const key = slug.toLowerCase().split('/')[0];
    const stream = await this.prisma.directStream.findUnique({
      where: { slug: key },
      include: { scoreboard: true },
    });
    if (!stream) return null;
    return {
      id: stream.id,
      slug: stream.slug,
      gameId: stream.gameId,
      sport: stream.sport,
      allowViewerReporting: stream.allowViewerReporting,
      eventConfirmThreshold: stream.eventConfirmThreshold,
      homeTeamName: stream.scoreboard?.homeTeamName ?? stream.scoreboardHomeTeam ?? 'Home',
      awayTeamName: stream.scoreboard?.awayTeamName ?? stream.scoreboardAwayTeam ?? 'Away',
      homeScore: stream.scoreboard?.homeScore ?? 0,
      awayScore: stream.scoreboard?.awayScore ?? 0,
      period: stream.scoreboard?.period ?? 1,
      periodDetail: stream.scoreboard?.periodDetail ?? null,
      clockSeconds: stream.scoreboard?.clockSeconds ?? 0,
    };
  }

  async getById(id: string): Promise<StoredGameEvent | null> {
    const row = await this.prisma.gameEvent.findUnique({
      where: { id },
      include: { _count: { select: { confirmations: true } } },
    });
    return row ? mapEvent(row) : null;
  }

  async listByStream(streamId: string, status?: GameEventStatus): Promise<StoredGameEvent[]> {
    const rows = await this.prisma.gameEvent.findMany({
      where: { directStreamId: streamId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { confirmations: true } } },
      take: 100,
    });
    return rows.map(mapEvent);
  }

  async create(
    data: Omit<StoredGameEvent, 'confirmationCount' | 'createdAt'> & { createdAt?: Date }
  ): Promise<StoredGameEvent> {
    const row = await this.prisma.gameEvent.create({
      data: {
        id: data.id,
        directStreamId: data.directStreamId,
        sport: data.sport,
        eventType: data.eventType,
        team: data.team,
        pointsDelta: data.pointsDelta,
        period: data.period,
        periodDetail: data.periodDetail,
        clockSeconds: data.clockSeconds,
        reportedByViewerId: data.reportedByViewerId,
        displayName: data.displayName,
        status: data.status,
        resolvedBy: data.resolvedBy,
        chatMessageId: data.chatMessageId,
        jerseyNumber: data.jerseyNumber,
        detail: data.detail,
        detailValue: data.detailValue,
        note: data.note,
        filmTimeSeconds: data.filmTimeSeconds,
      },
      include: { _count: { select: { confirmations: true } } },
    });
    return mapEvent(row);
  }

  async update(
    id: string,
    data: Partial<Pick<StoredGameEvent, 'status' | 'resolvedBy' | 'chatMessageId'>> & {
      confirmedAt?: Date | null;
    }
  ): Promise<StoredGameEvent> {
    const row = await this.prisma.gameEvent.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.resolvedBy !== undefined ? { resolvedBy: data.resolvedBy } : {}),
        ...(data.chatMessageId !== undefined ? { chatMessageId: data.chatMessageId } : {}),
        ...(data.confirmedAt !== undefined ? { confirmedAt: data.confirmedAt } : {}),
      },
      include: { _count: { select: { confirmations: true } } },
    });
    return mapEvent(row);
  }

  async add(eventId: string, viewerId: string): Promise<{ created: boolean; count: number }> {
    try {
      await this.prisma.gameEventConfirmation.create({
        data: { eventId, viewerId },
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') {
        const count = await this.prisma.gameEventConfirmation.count({ where: { eventId } });
        return { created: false, count };
      }
      throw error;
    }
    const count = await this.prisma.gameEventConfirmation.count({ where: { eventId } });
    return { created: true, count };
  }
}
