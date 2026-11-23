/**
 * Coach text commands: which game gets which stream.
 *
 * - A game is "on now" when it starts between 3 hours ago and 60 minutes from
 *   now (the game reader applies that window).
 * - A stream is "fresh" when it has a title, started within the last 3 hours
 *   and has an https URL. Only a fresh stream is ever put on a game without
 *   asking.
 * - A stream without https is dropped: a page cannot play it.
 *
 *   Games on now | Streams                         | Plan
 *   1            | 1 fresh                         | attach
 *   1            | several, or one not fresh       | ask which stream
 *   several      | any                             | ask which game (then which stream)
 *   0            | any                             | no game: the caller offers the nearest pages
 *   any          | 0                               | nothing live
 *
 * Options are ordered by how well their title matches, with Fuse.js. The order
 * never picks for the coach.
 */

import Fuse from 'fuse.js';

import { logger } from '../../../lib/logger';
import type { CoachGame, LiveStream } from '../interfaces';

/** A stream that started longer ago than this is not the game happening now. */
export const FRESH_MS = 3 * 60 * 60 * 1000;

/** A start time this far ahead still counts (clocks differ a little). */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Options in one question. Answers are single digits, and the text has to stay short. */
export const MAX_OPTIONS = 5;

export type AttachPlan =
  | { kind: 'nothing_live' }
  | { kind: 'attach'; game: CoachGame; stream: LiveStream }
  | { kind: 'ask_stream'; game: CoachGame; streams: LiveStream[] }
  | { kind: 'ask_game'; games: CoachGame[]; streams: LiveStream[] }
  | { kind: 'no_game'; streams: LiveStream[] };

export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** The streams a page can play. The rest are logged and dropped. */
export function playableStreams(streams: LiveStream[]): LiveStream[] {
  const playable = streams.filter((stream) => isHttpsUrl(stream.streamUrl));
  const dropped = streams.length - playable.length;
  if (dropped > 0) {
    logger.info({ dropped, providers: [...new Set(streams.map((s) => s.provider))] }, 'Coach text dropped streams without https');
  }
  return playable;
}

export function isFresh(stream: LiveStream, now: Date): boolean {
  if (!stream.title.trim() || !stream.startedAt || !isHttpsUrl(stream.streamUrl)) {
    return false;
  }
  const age = now.getTime() - stream.startedAt.getTime();
  return age <= FRESH_MS && age >= -CLOCK_SKEW_MS;
}

/**
 * Best title match first. Every item is kept: those Fuse does not match follow
 * in the order given.
 */
export function orderByMatch<T>(items: T[], titleOf: (item: T) => string, query: string): T[] {
  const text = query.trim();
  if (!text || items.length < 2) {
    return [...items];
  }
  const fuse = new Fuse(
    items.map((item, index) => ({ index, title: titleOf(item) })),
    { keys: ['title'], includeScore: true, ignoreLocation: true, threshold: 0.6 }
  );
  const matched = fuse.search(text).map((result) => result.item.index);
  const seen = new Set(matched);
  const rest = items.map((_item, index) => index).filter((index) => !seen.has(index));
  return [...matched, ...rest].map((index) => items[index]);
}

export interface PlanInput {
  /** The account's games on now. */
  games: CoachGame[];
  /** What the cameras report. */
  streams: LiveStream[];
  now: Date;
}

export function planAttach(input: PlanInput): AttachPlan {
  const streams = playableStreams(input.streams);
  if (streams.length === 0) {
    return { kind: 'nothing_live' };
  }
  const fresh = streams.filter((stream) => isFresh(stream, input.now));

  if (input.games.length === 0) {
    return { kind: 'no_game', streams: streams.slice(0, MAX_OPTIONS) };
  }

  if (input.games.length === 1) {
    const [game] = input.games;
    if (streams.length === 1 && fresh.length === 1) {
      return { kind: 'attach', game, stream: fresh[0] };
    }
    return {
      kind: 'ask_stream',
      game,
      streams: orderByMatch(streams, (s) => s.title, game.title).slice(0, MAX_OPTIONS),
    };
  }

  // Several games: the games are ordered by the stream the coach most likely means.
  const lead = fresh[0] ?? streams[0];
  return {
    kind: 'ask_game',
    games: orderByMatch(input.games, (g) => g.title, lead.title).slice(0, MAX_OPTIONS),
    streams: streams.slice(0, MAX_OPTIONS),
  };
}
