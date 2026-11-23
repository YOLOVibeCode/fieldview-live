/**
 * Picking the game and the stream: every row of the plan's decision table.
 */
import { describe, expect, it } from 'vitest';

import type { CoachGame, LiveStream } from '../interfaces';
import { isFresh, orderByMatch, planAttach, playableStreams } from '../resolve/GameResolver';

const NOW = new Date('2026-11-21T19:30:00.000Z');
const MINUTE = 60_000;

function game(title: string, overrides: Partial<CoachGame> = {}): CoachGame {
  return {
    eventId: `ev-${title}`,
    directStreamId: 'ds-1',
    title,
    parentSlug: 'diablos',
    eventSlug: title.toLowerCase().replace(/\W+/g, '-'),
    scheduledStartAt: new Date(NOW.getTime() - 30 * MINUTE),
    streamUrl: null,
    ...overrides,
  };
}

function stream(title: string, overrides: Partial<LiveStream> = {}): LiveStream {
  return {
    provider: 'veo',
    title,
    streamUrl: `https://stream.example.com/${encodeURIComponent(title)}.m3u8`,
    startedAt: new Date(NOW.getTime() - 20 * MINUTE),
    ...overrides,
  };
}

describe('GameResolver', () => {
  describe('the decision table', () => {
    it('one game, one fresh stream: attaches it', () => {
      const g = game('Diablos vs Sporting');
      const s = stream('Diablos - Sporting');

      expect(planAttach({ games: [g], streams: [s], now: NOW })).toEqual({ kind: 'attach', game: g, stream: s });
    });

    it('one game, several streams: asks which stream, best title match first', () => {
      const g = game('Diablos vs Sporting');
      const other = stream('U15 Solar', { startedAt: new Date(NOW.getTime() - 5 * MINUTE) });
      const best = stream('Diablos - Sporting');

      const plan = planAttach({ games: [g], streams: [other, best], now: NOW });

      expect(plan).toEqual({ kind: 'ask_stream', game: g, streams: [best, other] });
    });

    it('one game, one stream that is not fresh: asks', () => {
      const g = game('Diablos vs Sporting');
      const stale = stream('Diablos - Sporting', { startedAt: new Date(NOW.getTime() - 5 * 60 * MINUTE) });

      expect(planAttach({ games: [g], streams: [stale], now: NOW })).toEqual({ kind: 'ask_stream', game: g, streams: [stale] });
    });

    it('several games, one stream: asks which game, best title match first', () => {
      const a = game('U15 Solar');
      const b = game('Diablos vs Sporting');
      const s = stream('Diablos - Sporting');

      expect(planAttach({ games: [a, b], streams: [s], now: NOW })).toEqual({ kind: 'ask_game', games: [b, a], streams: [s] });
    });

    it('several games, several streams: asks which game first', () => {
      const a = game('U15 Solar');
      const b = game('Diablos vs Sporting');
      const s1 = stream('Diablos - Sporting');
      const s2 = stream('Other match');

      const plan = planAttach({ games: [a, b], streams: [s1, s2], now: NOW });

      expect(plan.kind).toBe('ask_game');
      expect(plan.kind === 'ask_game' && plan.streams).toHaveLength(2);
    });

    it('no game on now: says so, so the caller offers the nearest pages', () => {
      const s = stream('Diablos - Sporting');

      expect(planAttach({ games: [], streams: [s], now: NOW })).toEqual({ kind: 'no_game', streams: [s] });
    });

    it('no stream: nothing is live, whatever the games', () => {
      expect(planAttach({ games: [game('A')], streams: [], now: NOW })).toEqual({ kind: 'nothing_live' });
      expect(planAttach({ games: [], streams: [], now: NOW })).toEqual({ kind: 'nothing_live' });
    });
  });

  describe('what never gets picked without asking', () => {
    it('an untitled stream', () => {
      const g = game('Diablos vs Sporting');
      const untitled = stream('   ');

      expect(planAttach({ games: [g], streams: [untitled], now: NOW }).kind).toBe('ask_stream');
    });

    it('a stream with no start time', () => {
      const g = game('Diablos vs Sporting');

      expect(planAttach({ games: [g], streams: [stream('Diablos', { startedAt: null })], now: NOW }).kind).toBe('ask_stream');
    });

    it('a broadcast that started more than 3 hours ago', () => {
      expect(isFresh(stream('A', { startedAt: new Date(NOW.getTime() - 3 * 60 * MINUTE - 1) }), NOW)).toBe(false);
      expect(isFresh(stream('A', { startedAt: new Date(NOW.getTime() - 3 * 60 * MINUTE) }), NOW)).toBe(true);
    });
  });

  describe('https only', () => {
    it('drops a stream a page cannot play', () => {
      const plain = stream('A', { streamUrl: 'http://stream.example.com/a.m3u8' });
      const rtmp = stream('B', { streamUrl: 'rtmp://stream.example.com/b' });
      const junk = stream('C', { streamUrl: 'not a url' });
      const good = stream('D');

      expect(playableStreams([plain, rtmp, junk, good])).toEqual([good]);
      expect(planAttach({ games: [game('A')], streams: [plain], now: NOW })).toEqual({ kind: 'nothing_live' });
    });
  });

  describe('ordering', () => {
    it('keeps every item and never drops a poor match', () => {
      const ordered = orderByMatch(['Zebra Cup', 'Diablos vs Sporting', 'Solar'], (t) => t, 'Diablos - Sporting');

      expect(ordered[0]).toBe('Diablos vs Sporting');
      expect([...ordered].sort()).toEqual(['Diablos vs Sporting', 'Solar', 'Zebra Cup']);
    });

    it('keeps the given order when the query is empty', () => {
      expect(orderByMatch(['b', 'a'], (t) => t, '  ')).toEqual(['b', 'a']);
    });

    it('offers at most five', () => {
      const g = game('Diablos');
      const many = Array.from({ length: 8 }, (_v, i) => stream(`Match ${i}`));

      const plan = planAttach({ games: [g], streams: many, now: NOW });

      expect(plan.kind === 'ask_stream' && plan.streams).toHaveLength(5);
    });
  });
});
