/**
 * DemoStreamRoom — shared in-memory stream for the multi-channel PoC.
 * Two subscribers must observe the same sport, clock, scores, and pending events.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DemoStreamRoom } from '../DemoStreamRoom';

describe('DemoStreamRoom', () => {
  let room: DemoStreamRoom;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T15:00:00Z'));
    room = new DemoStreamRoom();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to soccer 0-0 stopped at 00:00 seed', () => {
    const snap = room.getSnapshot();
    expect(snap.sportId).toBe('soccer');
    expect(snap.homeScore).toBe(0);
    expect(snap.awayScore).toBe(0);
    expect(snap.clockStatus).toBe('stopped');
    expect(snap.clockSeconds).toBe(0);
    expect(snap.pendingEvent).toBeNull();
    expect(snap.playbackSrc).toContain('stream.mux.com');
  });

  it('setPlaybackSrc notifies subscribers', () => {
    const urls: string[] = [];
    room.subscribe(() => urls.push(room.getSnapshot().playbackSrc));
    room.setPlaybackSrc('https://example.com/live.m3u8', 'producer');
    expect(room.getSnapshot().playbackSrc).toBe('https://example.com/live.m3u8');
    expect(urls).toEqual(['https://example.com/live.m3u8']);
  });

  it('notifies every subscriber when sport changes', () => {
    const seen: string[] = [];
    room.subscribe(() => seen.push(room.getSnapshot().sportId));

    room.setSport('football', 'channel-a');

    expect(room.getSnapshot().sportId).toBe('football');
    expect(room.getSnapshot().clockSeconds).toBe(720);
    expect(room.getSnapshot().homeScore).toBe(0);
    expect(seen).toEqual(['football']);
  });

  it('start then pause respects football countdown', () => {
    room.setSport('football', 'a');
    room.startClock('a');
    vi.setSystemTime(new Date('2026-08-24T15:00:05Z'));
    room.pauseClock('a');

    expect(room.getSnapshot().clockStatus).toBe('paused');
    expect(room.getSnapshot().clockSeconds).toBe(715);
  });

  it('report from A is pending; B confirm applies score to both snapshots', () => {
    room.setSport('football', 'a');

    room.report('channel-a', 'touchdown', 'home');
    const pending = room.getSnapshot().pendingEvent;
    expect(pending).not.toBeNull();
    expect(pending?.label).toBe('Touchdown');
    expect(pending?.confirmationCount).toBe(1);
    expect(pending?.confirmationNeeded).toBe(2);
    expect(pending?.reportedByViewerId).toBe('channel-a');
    expect(room.getSnapshot().homeScore).toBe(0);

    room.confirm('channel-a', pending!.id);
    expect(room.getSnapshot().homeScore).toBe(0);
    expect(room.getSnapshot().pendingEvent).not.toBeNull();

    room.confirm('channel-b', pending!.id);
    expect(room.getSnapshot().homeScore).toBe(6);
    expect(room.getSnapshot().awayScore).toBe(0);
    expect(room.getSnapshot().pendingEvent).toBeNull();
  });

  it('hype events do not create a pending chip or change score', () => {
    room.setSport('football', 'a');
    room.report('channel-a', 'big_play', 'home');

    expect(room.getSnapshot().pendingEvent).toBeNull();
    expect(room.getSnapshot().homeScore).toBe(0);
    expect(room.getSnapshot().lastAction).toMatch(/Big Play/);
  });
});
