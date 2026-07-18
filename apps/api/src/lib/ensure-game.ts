/**
 * Shared utility: Ensure a Game record exists for a DirectStream.
 *
 * Creates one automatically if missing (resilient design).
 * Used by viewer unlock, admin auto-login, and anonymous token flows.
 */

import { prisma } from './prisma';
import { logger } from './logger';

export async function ensureGameForDirectStream(
  slug: string,
  directStream: { id: string; title: string; ownerAccountId: string; scheduledStartAt: Date | null; priceInCents: number }
): Promise<string> {
  const gameTitle = `Direct Stream: ${slug}`;

  // Try to find existing Game
  const existingGame = await prisma.game.findFirst({
    where: { title: gameTitle },
    select: { id: true },
  });

  if (existingGame) {
    return existingGame.id;
  }

  // Auto-create Game record (resilient fallback)
  logger.warn({ slug, directStreamId: directStream.id }, 'Game record missing for DirectStream - auto-creating');

  const keywordCode = `DIRECT-${slug.toUpperCase()}-${Date.now()}`;

  const newGame = await prisma.game.create({
    data: {
      ownerAccountId: directStream.ownerAccountId,
      title: gameTitle,
      homeTeam: directStream.title || slug,
      awayTeam: 'TBD',
      startsAt: directStream.scheduledStartAt || new Date(),
      priceCents: directStream.priceInCents || 0,
      currency: 'USD',
      keywordCode,
      qrUrl: `https://fieldview.live/direct/${slug}`,
      state: 'active',
    },
  });

  // Link the Game back to the DirectStream
  await prisma.directStream.update({
    where: { id: directStream.id },
    data: { gameId: newGame.id },
  });

  logger.info(
    { slug, gameId: newGame.id, directStreamId: directStream.id },
    'Game record auto-created and linked to DirectStream'
  );

  return newGame.id;
}
