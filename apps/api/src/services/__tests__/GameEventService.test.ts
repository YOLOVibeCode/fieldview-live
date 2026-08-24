/**
 * GameEventService Tests (TDD)
 *
 * Consensus: reporter counts as first confirmation.
 * eventConfirmThreshold = extra confirms needed beyond the reporter.
 * Default 2 extra → 3 total before scoreboard apply.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEventService } from '../GameEventService';
import type {
  IChatEventWriter,
  IGameEventConfirmationWriter,
  IGameEventPublisher,
  IGameEventReader,
  IGameEventWriter,
  IScoreAlertFanout,
  IScoreboardBroadcaster,
  IScoreboardMutator,
  IStreamContextReader,
  ScoreboardSnapshot,
  StoredGameEvent,
  StreamContext,
} from '../game-event.interfaces';

function stream(overrides: Partial<StreamContext> = {}): StreamContext {
  return {
    id: 'stream-1',
    slug: 'tchs',
    gameId: 'game-1',
    sport: 'football',
    allowViewerReporting: true,
    eventConfirmThreshold: 2,
    homeTeamName: 'Eagles',
    awayTeamName: 'Hawks',
    homeScore: 0,
    awayScore: 0,
    period: 1,
    periodDetail: null,
    clockSeconds: 420,
    ...overrides,
  };
}

function storedEvent(overrides: Partial<StoredGameEvent> = {}): StoredGameEvent {
  return {
    id: 'evt-1',
    directStreamId: 'stream-1',
    sport: 'football',
    eventType: 'touchdown',
    team: 'home',
    pointsDelta: 6,
    period: 1,
    periodDetail: null,
    clockSeconds: 420,
    reportedByViewerId: 'viewer-a',
    displayName: 'Alice A.',
    status: 'pending',
    resolvedBy: null,
    chatMessageId: 'chat-1',
    createdAt: new Date('2026-08-21T00:00:00Z'),
    confirmationCount: 1,
    jerseyNumber: null,
    detail: null,
    detailValue: null,
    note: null,
    filmTimeSeconds: null,
    ...overrides,
  };
}

function snapshot(overrides: Partial<ScoreboardSnapshot> = {}): ScoreboardSnapshot {
  return {
    homeScore: 0,
    awayScore: 0,
    period: 1,
    periodDetail: null,
    homeTeamName: 'Eagles',
    awayTeamName: 'Hawks',
    homeJerseyColor: '#003366',
    awayJerseyColor: '#CC0000',
    clockMode: 'stopped',
    clockSeconds: 420,
    clockStartedAt: null,
    isVisible: true,
    position: 'top-left',
    lastEditedBy: null,
    lastEditedAt: null,
    ...overrides,
  };
}

describe('GameEventService', () => {
  let service: GameEventService;
  let streamReader: IStreamContextReader;
  let eventReader: IGameEventReader;
  let eventWriter: IGameEventWriter;
  let confirmWriter: IGameEventConfirmationWriter;
  let scoreboard: IScoreboardMutator;
  let chat: IChatEventWriter;
  let publisher: IGameEventPublisher;
  let broadcaster: IScoreboardBroadcaster;
  let alerts: IScoreAlertFanout;
  let ctx: StreamContext;
  let created: StoredGameEvent;

  beforeEach(() => {
    ctx = stream();
    created = storedEvent();

    streamReader = { getBySlug: vi.fn().mockResolvedValue(ctx) };
    eventReader = {
      getById: vi.fn().mockResolvedValue(created),
      listByStream: vi.fn().mockResolvedValue([]),
    };
    eventWriter = {
      create: vi.fn().mockImplementation(async (data) => ({
        ...created,
        ...data,
        confirmationCount: 0,
        createdAt: new Date(),
      })),
      update: vi.fn().mockImplementation(async (id, data) => ({
        ...created,
        id,
        ...data,
      })),
    };
    confirmWriter = {
      add: vi.fn().mockResolvedValue({ created: true, count: 1 }),
    };
    scoreboard = {
      applyDeltas: vi.fn().mockResolvedValue(snapshot({ homeScore: 6, lastEditedBy: 'Alice A.' })),
    };
    chat = {
      createEventMessage: vi.fn().mockResolvedValue({ id: 'chat-1' }),
      updateEventMetadata: vi.fn().mockResolvedValue(undefined),
    };
    publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    broadcaster = { publish: vi.fn() };
    alerts = { notify: vi.fn().mockResolvedValue(undefined) };

    service = new GameEventService(
      streamReader,
      eventReader,
      eventWriter,
      confirmWriter,
      scoreboard,
      chat,
      publisher,
      broadcaster,
      alerts
    );
  });

  describe('report', () => {
    it('creates a pending scoring event and counts the reporter as first confirmation', async () => {
      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
      });

      expect(result.applied).toBe(false);
      expect(result.payload.status).toBe('pending');
      expect(result.payload.confirmationCount).toBe(1);
      expect(result.payload.confirmationNeeded).toBe(3);
      expect(eventWriter.create).toHaveBeenCalled();
      expect(confirmWriter.add).toHaveBeenCalledWith(expect.any(String), 'viewer-a');
      expect(scoreboard.applyDeltas).not.toHaveBeenCalled();
      expect(chat.createEventMessage).toHaveBeenCalled();
      expect(publisher.publish).toHaveBeenCalled();
    });

    it('rejects reports when allowViewerReporting is false', async () => {
      (streamReader.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        stream({ allowViewerReporting: false })
      );
      await expect(
        service.report({
          slug: 'tchs',
          viewerId: 'viewer-a',
          displayName: 'Alice A.',
          eventTypeId: 'touchdown',
          team: 'home',
        })
      ).rejects.toThrow(/not enabled/i);
    });

    it('rejects unknown event types for the stream sport', async () => {
      await expect(
        service.report({
          slug: 'tchs',
          viewerId: 'viewer-a',
          displayName: 'Alice A.',
          eventTypeId: 'goal',
          team: 'home',
        })
      ).rejects.toThrow();
    });

    it('auto-confirms hype events without touching the scoreboard', async () => {
      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'big_play',
        team: 'home',
      });

      expect(result.payload.status).toBe('confirmed');
      expect(result.applied).toBe(false);
      expect(scoreboard.applyDeltas).not.toHaveBeenCalled();
      expect(alerts.notify).not.toHaveBeenCalled();
    });

    it('applies immediately when threshold is 0', async () => {
      (streamReader.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        stream({ eventConfirmThreshold: 0 })
      );
      (confirmWriter.add as ReturnType<typeof vi.fn>).mockResolvedValue({ created: true, count: 1 });

      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
      });

      expect(result.applied).toBe(true);
      expect(scoreboard.applyDeltas).toHaveBeenCalledWith(
        expect.objectContaining({ homeDelta: 6, awayDelta: 0 })
      );
      expect(alerts.notify).toHaveBeenCalled();
      expect(broadcaster.publish).toHaveBeenCalledWith('tchs', expect.anything(), 'football');
    });
  });

  describe('confirm', () => {
    it('does not apply until extra confirmations reach the threshold', async () => {
      (confirmWriter.add as ReturnType<typeof vi.fn>).mockResolvedValue({ created: true, count: 2 });
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({ confirmationCount: 1 })
      );

      const result = await service.confirm({
        slug: 'tchs',
        eventId: 'evt-1',
        viewerId: 'viewer-b',
      });

      expect(result.applied).toBe(false);
      expect(result.payload.confirmationCount).toBe(2);
      expect(scoreboard.applyDeltas).not.toHaveBeenCalled();
    });

    it('applies score delta when threshold is reached', async () => {
      (confirmWriter.add as ReturnType<typeof vi.fn>).mockResolvedValue({ created: true, count: 3 });
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({ confirmationCount: 2 })
      );

      const result = await service.confirm({
        slug: 'tchs',
        eventId: 'evt-1',
        viewerId: 'viewer-c',
      });

      expect(result.applied).toBe(true);
      expect(result.payload.status).toBe('confirmed');
      expect(scoreboard.applyDeltas).toHaveBeenCalledWith(
        expect.objectContaining({ homeDelta: 6, awayDelta: 0, lastEditedBy: 'Alice A.' })
      );
      expect(alerts.notify).toHaveBeenCalled();
    });

    it('rejects duplicate confirmation from the same viewer', async () => {
      (confirmWriter.add as ReturnType<typeof vi.fn>).mockResolvedValue({ created: false, count: 1 });

      await expect(
        service.confirm({ slug: 'tchs', eventId: 'evt-1', viewerId: 'viewer-a' })
      ).rejects.toThrow(/already confirmed/i);
    });

    it('rejects confirm on an already resolved event', async () => {
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({ status: 'confirmed' })
      );

      await expect(
        service.confirm({ slug: 'tchs', eventId: 'evt-1', viewerId: 'viewer-b' })
      ).rejects.toThrow(/already/);
    });

    it('applies soccer own_goal points to the opponent', async () => {
      (streamReader.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        stream({ sport: 'soccer', eventConfirmThreshold: 0 })
      );
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({
          sport: 'soccer',
          eventType: 'own_goal',
          team: 'home',
          pointsDelta: 1,
          confirmationCount: 0,
        })
      );
      (confirmWriter.add as ReturnType<typeof vi.fn>).mockResolvedValue({ created: true, count: 1 });

      const ownGoal = storedEvent({
        sport: 'soccer',
        eventType: 'own_goal',
        team: 'home',
        pointsDelta: 1,
      });
      (eventWriter.create as ReturnType<typeof vi.fn>).mockResolvedValue(ownGoal);

      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'own_goal',
        team: 'home',
      });

      expect(result.applied).toBe(true);
      expect(scoreboard.applyDeltas).toHaveBeenCalledWith(
        expect.objectContaining({ homeDelta: 0, awayDelta: 1 })
      );
    });
  });

  describe('resolve (producer)', () => {
    it('producer confirm applies immediately even below threshold', async () => {
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({ confirmationCount: 1 })
      );

      const result = await service.resolve({
        slug: 'tchs',
        eventId: 'evt-1',
        action: 'confirm',
        resolverName: 'Admin',
      });

      expect(result.applied).toBe(true);
      expect(eventWriter.update).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({ status: 'confirmed', resolvedBy: 'producer' })
      );
      expect(scoreboard.applyDeltas).toHaveBeenCalled();
    });

    it('producer reject does not apply score and skips SMS', async () => {
      const result = await service.resolve({
        slug: 'tchs',
        eventId: 'evt-1',
        action: 'reject',
        resolverName: 'Admin',
      });

      expect(result.applied).toBe(false);
      expect(result.payload.status).toBe('rejected');
      expect(scoreboard.applyDeltas).not.toHaveBeenCalled();
      expect(alerts.notify).not.toHaveBeenCalled();
    });

    it('advances period on confirmed quarter_end', async () => {
      (eventReader.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        storedEvent({
          eventType: 'quarter_end',
          team: null,
          pointsDelta: 0,
          confirmationCount: 1,
        })
      );

      await service.resolve({
        slug: 'tchs',
        eventId: 'evt-1',
        action: 'confirm',
        resolverName: 'Admin',
      });

      expect(scoreboard.applyDeltas).toHaveBeenCalledWith(
        expect.objectContaining({ period: 2, homeDelta: 0, awayDelta: 0 })
      );
    });
  });

  describe('narration fields', () => {
    it('payload includes narration string when detail is provided', async () => {
      (eventWriter.create as ReturnType<typeof vi.fn>).mockImplementation(async (data) => ({
        ...storedEvent(),
        ...data,
        confirmationCount: 0,
        createdAt: new Date(),
      }));

      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
        jerseyNumber: 12,
        detail: 'run',
        detailValue: 18,
      });

      expect(result.payload.narration).toBe('Touchdown — Eagles, #12 — 18-yd run');
      expect(result.payload.jerseyNumber).toBe(12);
      expect(result.payload.detail).toBe('run');
      expect(result.payload.detailValue).toBe(18);
    });

    it('payload narration falls back to label only when no detail', async () => {
      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
      });

      expect(result.payload.narration).toBe('Touchdown — Eagles');
    });

    it('payload includes periodLabel', async () => {
      const result = await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
      });

      expect(result.payload.periodLabel).toBe('Q1');
    });

    it('rejects an invalid detail id against the catalog', async () => {
      await expect(
        service.report({
          slug: 'tchs',
          viewerId: 'viewer-a',
          displayName: 'Alice A.',
          eventTypeId: 'touchdown',
          team: 'home',
          detail: 'dropkick',
        })
      ).rejects.toThrow(/Unknown detail/i);
    });

    it('persists filmTimeSeconds in create call', async () => {
      await service.report({
        slug: 'tchs',
        viewerId: 'viewer-a',
        displayName: 'Alice A.',
        eventTypeId: 'touchdown',
        team: 'home',
        filmTimeSeconds: 305,
      });

      expect(eventWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({ filmTimeSeconds: 305 })
      );
    });
  });
});
