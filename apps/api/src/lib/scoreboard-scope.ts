/**
 * One scoreboard per game. A parent slug uses the parent board.
 * A parent/event slug uses that event's board, created on first read.
 */

import { seedClockSeconds, sportRegistry } from '@fieldview/data-model';
import type { DirectStream, DirectStreamEvent, GameScoreboard } from '@prisma/client';
import { parseDirectKey } from './direct-slug';
import { NotFoundError } from './errors';
import { prisma } from './prisma';

export interface ScopedScoreboard {
  scopeKey: string;
  parentSlug: string;
  stream: DirectStream & { scoreboard: GameScoreboard };
  scoreboard: GameScoreboard;
}

export async function getOrCreateScopedScoreboard(rawSlug: string): Promise<ScopedScoreboard> {
  const parsed = parseDirectKey(rawSlug);
  const stream = await prisma.directStream.findUnique({ where: { slug: parsed.parentSlug } });
  if (!stream) throw new NotFoundError('Stream not found');

  let event: DirectStreamEvent | null = null;
  if (parsed.eventSlug) {
    event = await prisma.directStreamEvent.findUnique({
      where: {
        directStreamId_eventSlug: { directStreamId: stream.id, eventSlug: parsed.eventSlug },
      },
    });
    if (!event) throw new NotFoundError('Event not found');
  }

  const scoreboard = await findOrCreateBoard(stream, event);
  return {
    scopeKey: event ? `${parsed.parentSlug}/${event.eventSlug}` : parsed.parentSlug,
    parentSlug: parsed.parentSlug,
    stream: { ...stream, scoreboard },
    scoreboard,
  };
}

async function findOrCreateBoard(stream: DirectStream, event: DirectStreamEvent | null): Promise<GameScoreboard> {
  const existing = await prisma.gameScoreboard.findFirst({
    where: event
      ? { directStreamEventId: event.id }
      : { directStreamId: stream.id, directStreamEventId: null },
  });
  if (existing) return existing;

  let seedSeconds = 0;
  try {
    seedSeconds = seedClockSeconds(sportRegistry.getSport(stream.sport));
  } catch { /* soccer-style 0 */ }

  return prisma.gameScoreboard.create({
    data: {
      directStreamId: stream.id,
      directStreamEventId: event?.id ?? null,
      homeTeamName: event?.scoreboardHomeTeam ?? stream.scoreboardHomeTeam ?? 'Home',
      awayTeamName: event?.scoreboardAwayTeam ?? stream.scoreboardAwayTeam ?? 'Away',
      homeJerseyColor: event?.scoreboardHomeColor ?? stream.scoreboardHomeColor ?? '#003366',
      awayJerseyColor: event?.scoreboardAwayColor ?? stream.scoreboardAwayColor ?? '#CC0000',
      homeScore: 0,
      awayScore: 0,
      clockMode: 'stopped',
      clockSeconds: seedSeconds,
      isVisible: true,
      position: 'top',
    },
  });
}
