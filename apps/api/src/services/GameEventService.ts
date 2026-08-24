/**
 * GameEventService
 *
 * Crowdsourced report → consensus confirm → scoreboard apply.
 */

import { randomUUID } from 'crypto';
import {
  PeriodLabeler,
  ReportGameEventSchema,
  ScoreDeltaCalculator,
  sportRegistry,
  buildNarration,
  type GameEventPayload,
  type ISportEventType,
  type TeamSide,
} from '@fieldview/data-model';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import type { IGameEventService, ReportEventResult } from './IGameEventService';
import type {
  ConfirmEventInput,
  IChatEventWriter,
  IGameEventConfirmationWriter,
  IGameEventPublisher,
  IGameEventReader,
  IGameEventWriter,
  IScoreAlertFanout,
  IScoreboardBroadcaster,
  IScoreboardMutator,
  IStreamContextReader,
  ReportEventInput,
  ResolveEventInput,
  StoredGameEvent,
  StreamContext,
} from './game-event.interfaces';

const scoreDelta = new ScoreDeltaCalculator();
const periodLabeler = new PeriodLabeler(sportRegistry);

export class GameEventService implements IGameEventService {
  constructor(
    private streamReader: IStreamContextReader,
    private eventReader: IGameEventReader,
    private eventWriter: IGameEventWriter,
    private confirmWriter: IGameEventConfirmationWriter,
    private scoreboard: IScoreboardMutator,
    private chat: IChatEventWriter,
    private publisher: IGameEventPublisher,
    private broadcaster: IScoreboardBroadcaster,
    private alerts: IScoreAlertFanout
  ) {}

  async report(input: ReportEventInput): Promise<ReportEventResult> {
    const ctx = await this.requireStream(input.slug);
    if (!ctx.allowViewerReporting) {
      throw new ForbiddenError('Viewer event reporting is not enabled on this stream');
    }

    const parsed = ReportGameEventSchema.safeParse({
      sportId: ctx.sport,
      eventTypeId: input.eventTypeId,
      team: input.team,
      clockSeconds: input.clockSeconds,
      jerseyNumber: input.jerseyNumber,
      detail: input.detail,
      detailValue: input.detailValue,
      note: input.note,
      filmTimeSeconds: input.filmTimeSeconds,
    });
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid event');
    }

    const eventType = sportRegistry.getEventType(ctx.sport, input.eventTypeId);

    // Validate detail id against catalog if provided
    if (input.detail) {
      const validDetail = eventType.detailOptions?.some((d) => d.id === input.detail);
      if (!validDetail) {
        throw new BadRequestError(`Unknown detail "${input.detail}" for event "${input.eventTypeId}"`);
      }
    }

    const team = (input.team ?? null) as TeamSide | null;
    const needed = this.confirmationNeeded(ctx, eventType);
    const id = randomUUID();

    let event = await this.eventWriter.create({
      id,
      directStreamId: ctx.id,
      sport: ctx.sport,
      eventType: eventType.id,
      team,
      pointsDelta: eventType.pointsDelta,
      period: ctx.period,
      periodDetail: ctx.periodDetail,
      clockSeconds: input.clockSeconds ?? ctx.clockSeconds,
      reportedByViewerId: input.viewerId,
      displayName: input.displayName,
      status: 'pending',
      resolvedBy: null,
      chatMessageId: null,
      jerseyNumber: input.jerseyNumber ?? null,
      detail: input.detail ?? null,
      detailValue: input.detailValue ?? null,
      note: input.note ?? null,
      filmTimeSeconds: input.filmTimeSeconds ?? null,
    });

    const { count } = await this.confirmWriter.add(id, input.viewerId);
    event = { ...event, confirmationCount: count };

    const autoConfirm = !eventType.requiresConfirmation;
    const reached = count >= needed && eventType.requiresConfirmation;
    if (autoConfirm) {
      event = await this.eventWriter.update(id, {
        status: 'confirmed',
        resolvedBy: 'auto',
        confirmedAt: new Date(),
      });
      event = { ...event, confirmationCount: count };
    }

    let payload = this.toPayloadWithCtx(event, eventType, needed, count, ctx);
    payload = await this.persistChat(ctx, input, payload, event);
    event = { ...event, chatMessageId: payload.chatMessageId, confirmationCount: count };

    if (reached) {
      return this.applyConfirmed(ctx, event, eventType, needed, count, 'consensus');
    }

    if (ctx.gameId) {
      await this.publisher.publish(ctx.gameId, payload);
    }

    return { event: { ...event, confirmationCount: count }, payload, applied: false };
  }

  async confirm(input: ConfirmEventInput): Promise<ReportEventResult> {
    const ctx = await this.requireStream(input.slug);
    const event = await this.requireEvent(input.eventId, ctx.id);
    if (event.status !== 'pending') {
      throw new BadRequestError(`Event is already ${event.status}`);
    }

    const { created, count } = await this.confirmWriter.add(event.id, input.viewerId);
    if (!created) {
      throw new ConflictError('You already confirmed this event');
    }

    const eventType = sportRegistry.getEventType(event.sport, event.eventType);
    const needed = this.confirmationNeeded(ctx, eventType);
    const updated = { ...event, confirmationCount: count };

    if (count >= needed) {
      return this.applyConfirmed(ctx, updated, eventType, needed, count, 'consensus');
    }

    const payload = this.toPayloadWithCtx(updated, eventType, needed, count, ctx);
    await this.syncChatAndPublish(ctx, updated, payload);
    return { event: updated, payload, applied: false };
  }

  async resolve(input: ResolveEventInput): Promise<ReportEventResult> {
    const ctx = await this.requireStream(input.slug);
    const event = await this.requireEvent(input.eventId, ctx.id);
    if (event.status !== 'pending') {
      throw new BadRequestError(`Event is already ${event.status}`);
    }

    const eventType = sportRegistry.getEventType(event.sport, event.eventType);
    const needed = this.confirmationNeeded(ctx, eventType);

    if (input.action === 'reject') {
      const rejected = await this.eventWriter.update(event.id, {
        status: 'rejected',
        resolvedBy: 'producer',
      });
      const payload = this.toPayloadWithCtx(
        { ...rejected, confirmationCount: event.confirmationCount },
        eventType,
        needed,
        event.confirmationCount,
        ctx
      );
      await this.syncChatAndPublish(ctx, rejected, payload);
      return { event: { ...rejected, confirmationCount: event.confirmationCount }, payload, applied: false };
    }

    return this.applyConfirmed(
      ctx,
      event,
      eventType,
      needed,
      event.confirmationCount,
      'producer'
    );
  }

  async list(slug: string, status?: 'pending' | 'confirmed' | 'rejected'): Promise<GameEventPayload[]> {
    const ctx = await this.requireStream(slug);
    const rows = await this.eventReader.listByStream(ctx.id, status);
    return rows.map((row) => {
      const eventType = sportRegistry.getEventType(row.sport, row.eventType);
      return this.toPayloadWithCtx(row, eventType, this.confirmationNeeded(ctx, eventType), row.confirmationCount, ctx);
    });
  }

  private confirmationNeeded(ctx: StreamContext, eventType: ISportEventType): number {
    if (!eventType.requiresConfirmation) return 0;
    return 1 + ctx.eventConfirmThreshold;
  }

  private async applyConfirmed(
    ctx: StreamContext,
    event: StoredGameEvent,
    eventType: ISportEventType,
    needed: number,
    count: number,
    resolvedBy: 'consensus' | 'producer' | 'auto'
  ): Promise<ReportEventResult> {
    const confirmed = await this.eventWriter.update(event.id, {
      status: 'confirmed',
      resolvedBy,
      confirmedAt: new Date(),
    });
    const withCount = { ...confirmed, confirmationCount: count };

    const { homeDelta, awayDelta } = scoreDelta.resolveScoreDelta(eventType, event.team);
    const periodPatch = this.nextPeriod(ctx, eventType);
    const appliesBoard = homeDelta !== 0 || awayDelta !== 0 || periodPatch.period !== undefined || periodPatch.periodDetail !== undefined;

    let applied = false;
    if (appliesBoard) {
      const snap = await this.scoreboard.applyDeltas({
        streamId: ctx.id,
        homeDelta,
        awayDelta,
        period: periodPatch.period,
        periodDetail: periodPatch.periodDetail,
        lastEditedBy: event.displayName,
      });
      this.broadcaster.publish(ctx.slug, snap, ctx.sport);
      applied = true;

      if (eventType.notifyWorthy) {
        await this.alerts.notify({
          slug: ctx.slug,
          streamId: ctx.id,
          label: eventType.label.toUpperCase(),
          homeTeamName: snap.homeTeamName,
          awayTeamName: snap.awayTeamName,
          homeScore: snap.homeScore,
          awayScore: snap.awayScore,
          periodLabel: periodLabeler.formatPeriod(ctx.sport, snap.period, snap.periodDetail),
        });
      }
    }

    const payload = this.toPayloadWithCtx(withCount, eventType, needed, count, ctx);
    await this.syncChatAndPublish(ctx, withCount, payload);
    return { event: withCount, payload, applied };
  }

  private nextPeriod(
    ctx: StreamContext,
    eventType: ISportEventType
  ): { period?: number; periodDetail?: string | null } {
    if (eventType.id === 'switch_half') {
      const next = ctx.periodDetail === 'bottom' ? 'top' : 'bottom';
      return { periodDetail: next };
    }
    if (eventType.advancesPeriod) {
      const sport = sportRegistry.getSport(ctx.sport);
      const nextPeriod = ctx.period + 1;
      const patch: { period: number; periodDetail?: string | null } = { period: nextPeriod };
      if (sport.periods.supportsPeriodDetail) {
        patch.periodDetail = 'top';
      }
      return patch;
    }
    return {};
  }

  private toPayload(
    event: StoredGameEvent,
    eventType: ISportEventType,
    needed: number,
    count: number
  ): GameEventPayload {
    const teamName =
      event.team === 'home'
        ? undefined // resolved in context; leave undefined when building without ctx
        : undefined;

    const narration = buildNarration(eventType, {
      team: event.team,
      jerseyNumber: event.jerseyNumber,
      detail: event.detail,
      detailValue: event.detailValue,
    });

    return {
      id: event.id,
      sportId: event.sport,
      eventTypeId: event.eventType,
      label: eventType.label,
      icon: eventType.icon,
      category: eventType.category,
      team: event.team,
      status: event.status,
      confirmationCount: count,
      confirmationNeeded: needed,
      pointsDelta: event.pointsDelta,
      displayName: event.displayName,
      reportedByViewerId: event.reportedByViewerId,
      chatMessageId: event.chatMessageId,
      createdAt: (event.createdAt instanceof Date ? event.createdAt : new Date()).toISOString(),
      narration,
      clockSeconds: event.clockSeconds,
      jerseyNumber: event.jerseyNumber,
      detail: event.detail,
      detailValue: event.detailValue,
      note: event.note,
      filmTimeSeconds: event.filmTimeSeconds,
    };
  }

  private toPayloadWithCtx(
    event: StoredGameEvent,
    eventType: ISportEventType,
    needed: number,
    count: number,
    ctx: StreamContext
  ): GameEventPayload {
    const teamName = event.team === 'home' ? ctx.homeTeamName : event.team === 'away' ? ctx.awayTeamName : undefined;

    const narration = buildNarration(eventType, {
      team: event.team,
      teamName,
      jerseyNumber: event.jerseyNumber,
      detail: event.detail,
      detailValue: event.detailValue,
    });

    const periodLabel = periodLabeler.formatPeriod(
      ctx.sport,
      event.period ?? ctx.period,
      event.periodDetail ?? ctx.periodDetail
    );

    return {
      id: event.id,
      sportId: event.sport,
      eventTypeId: event.eventType,
      label: eventType.label,
      icon: eventType.icon,
      category: eventType.category,
      team: event.team,
      status: event.status,
      confirmationCount: count,
      confirmationNeeded: needed,
      pointsDelta: event.pointsDelta,
      displayName: event.displayName,
      reportedByViewerId: event.reportedByViewerId,
      chatMessageId: event.chatMessageId,
      createdAt: (event.createdAt instanceof Date ? event.createdAt : new Date()).toISOString(),
      narration,
      periodLabel,
      clockSeconds: event.clockSeconds,
      jerseyNumber: event.jerseyNumber,
      detail: event.detail,
      detailValue: event.detailValue,
      note: event.note,
      filmTimeSeconds: event.filmTimeSeconds,
    };
  }

  private async persistChat(
    ctx: StreamContext,
    input: ReportEventInput,
    payload: GameEventPayload,
    event: StoredGameEvent
  ): Promise<GameEventPayload> {
    if (!ctx.gameId) return payload;
    const teamLabel = payload.team ? ` — ${payload.team === 'home' ? ctx.homeTeamName : ctx.awayTeamName}` : '';
    const created = await this.chat.createEventMessage({
      gameId: ctx.gameId,
      viewerId: input.viewerId,
      displayName: input.displayName,
      message: `${payload.label}${teamLabel}`,
      directStreamId: ctx.id,
      metadata: payload,
    });
    const updated = await this.eventWriter.update(event.id, { chatMessageId: created.id });
    const withChat: GameEventPayload = { ...payload, chatMessageId: created.id };
    await this.chat.updateEventMetadata(created.id, withChat);
    void updated;
    return withChat;
  }

  private async syncChatAndPublish(
    ctx: StreamContext,
    event: StoredGameEvent,
    payload: GameEventPayload
  ): Promise<void> {
    if (event.chatMessageId) {
      await this.chat.updateEventMetadata(event.chatMessageId, payload);
    }
    if (ctx.gameId) {
      await this.publisher.publish(ctx.gameId, payload);
    }
  }

  private async requireStream(slug: string): Promise<StreamContext> {
    const ctx = await this.streamReader.getBySlug(slug.toLowerCase().split('/')[0]);
    if (!ctx) throw new NotFoundError('Stream not found');
    return ctx;
  }

  private async requireEvent(eventId: string, streamId: string): Promise<StoredGameEvent> {
    const event = await this.eventReader.getById(eventId);
    if (!event || event.directStreamId !== streamId) {
      throw new NotFoundError('Event not found');
    }
    return event;
  }
}
