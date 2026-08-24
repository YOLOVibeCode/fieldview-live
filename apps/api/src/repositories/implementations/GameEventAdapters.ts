/**
 * Prisma adapters for GameEventService scoreboard / chat / SMS ports.
 */

import type { PrismaClient } from '@prisma/client';
import type { GameEventPayload } from '@fieldview/data-model';
import { PeriodLabeler, sportRegistry } from '@fieldview/data-model';
import type {
  IChatEventWriter,
  IScoreAlertFanout,
  IScoreboardBroadcaster,
  IScoreboardMutator,
  ScoreboardSnapshot,
} from '../../services/game-event.interfaces';
import type { IChatWriter } from '../IChatRepository';
import { getScoreboardPubSub, type ScoreboardEvent } from '../../lib/scoreboard-pubsub';
import { getChatPubSub } from '../../lib/chat-pubsub';
import type { ISmsWriter } from '../../services/ISmsService';
import { logger } from '../../lib/logger';

const periodLabeler = new PeriodLabeler(sportRegistry);

export class PrismaScoreboardMutator implements IScoreboardMutator {
  constructor(private prisma: PrismaClient) {}

  async applyDeltas(input: {
    streamId: string;
    homeDelta: number;
    awayDelta: number;
    period?: number;
    periodDetail?: string | null;
    lastEditedBy: string;
  }): Promise<ScoreboardSnapshot> {
    const existing = await this.prisma.gameScoreboard.findUnique({
      where: { directStreamId: input.streamId },
    });
    if (!existing) {
      throw new Error('Scoreboard not found');
    }

    const updated = await this.prisma.gameScoreboard.update({
      where: { id: existing.id },
      data: {
        homeScore: Math.max(0, existing.homeScore + input.homeDelta),
        awayScore: Math.max(0, existing.awayScore + input.awayDelta),
        ...(input.period !== undefined ? { period: input.period } : {}),
        ...(input.periodDetail !== undefined ? { periodDetail: input.periodDetail } : {}),
        lastEditedBy: input.lastEditedBy,
        lastEditedAt: new Date(),
      },
    });

    return {
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      period: updated.period,
      periodDetail: updated.periodDetail,
      homeTeamName: updated.homeTeamName,
      awayTeamName: updated.awayTeamName,
      homeJerseyColor: updated.homeJerseyColor,
      awayJerseyColor: updated.awayJerseyColor,
      clockMode: updated.clockMode,
      clockSeconds: updated.clockSeconds,
      clockStartedAt: updated.clockStartedAt,
      isVisible: updated.isVisible,
      position: updated.position,
      lastEditedBy: updated.lastEditedBy,
      lastEditedAt: updated.lastEditedAt,
    };
  }
}

export class ChatEventWriterAdapter implements IChatEventWriter {
  constructor(private chatWriter: IChatWriter) {}

  async createEventMessage(data: {
    gameId: string;
    viewerId: string;
    displayName: string;
    message: string;
    directStreamId: string;
    metadata: GameEventPayload;
  }): Promise<{ id: string }> {
    const msg = await this.chatWriter.createMessage({
      gameId: data.gameId,
      viewerId: data.viewerId,
      displayName: data.displayName,
      message: data.message,
      directStreamId: data.directStreamId,
      kind: 'game_event',
      metadata: data.metadata as unknown as Record<string, unknown>,
    });
    await getChatPubSub().publish(data.gameId, msg);
    return { id: msg.id };
  }

  async updateEventMetadata(messageId: string, metadata: GameEventPayload): Promise<void> {
    await this.chatWriter.updateMessageMetadata(
      messageId,
      metadata as unknown as Record<string, unknown>
    );
  }
}

export class ScoreboardBroadcasterAdapter implements IScoreboardBroadcaster {
  publish(slug: string, snapshot: ScoreboardSnapshot, sport: string): void {
    const label = periodLabeler.formatPeriod(sport, snapshot.period, snapshot.periodDetail);
    let hideClock = false;
    let clockDirection: 'up' | 'down' | 'none' = 'up';
    try {
      const sportConfig = sportRegistry.getSport(sport);
      hideClock = sportConfig.clock.mode === 'none';
      clockDirection = sportConfig.clock.mode;
    } catch {
      hideClock = false;
      clockDirection = 'up';
    }
    const event: ScoreboardEvent = {
      homeTeamName: snapshot.homeTeamName,
      awayTeamName: snapshot.awayTeamName,
      homeJerseyColor: snapshot.homeJerseyColor,
      awayJerseyColor: snapshot.awayJerseyColor,
      homeScore: snapshot.homeScore,
      awayScore: snapshot.awayScore,
      clockMode: snapshot.clockMode,
      clockSeconds: snapshot.clockSeconds,
      clockStartedAt: snapshot.clockStartedAt?.toISOString() ?? null,
      isVisible: snapshot.isVisible,
      position: snapshot.position,
      lastEditedBy: snapshot.lastEditedBy,
      lastEditedAt: snapshot.lastEditedAt?.toISOString() ?? null,
      period: snapshot.period,
      periodDetail: snapshot.periodDetail,
      periodLabel: label,
      sport,
      hideClock,
      clockDirection,
    };
    getScoreboardPubSub().publish(slug, event);
  }
}

const smsDebounce = new Map<string, number>();
const SMS_DEBOUNCE_MS = 30_000;

export class ScoreAlertFanoutAdapter implements IScoreAlertFanout {
  constructor(
    private prisma: PrismaClient,
    private sms: ISmsWriter
  ) {}

  async notify(input: {
    slug: string;
    streamId: string;
    label: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    periodLabel: string;
  }): Promise<void> {
    const debounceKey = `${input.streamId}:${input.label}`;
    const last = smsDebounce.get(debounceKey) ?? 0;
    if (Date.now() - last < SMS_DEBOUNCE_MS) {
      return;
    }
    smsDebounce.set(debounceKey, Date.now());

    const subs = await this.prisma.subscription.findMany({
      where: {
        directStreamId: input.streamId,
        status: 'active',
        preference: { in: ['sms', 'both'] },
      },
      include: { viewer: true },
    });

    const watchUrl = `https://fieldview.live/direct/${input.slug}`;
    const body = `${input.label}! ${input.homeTeamName} ${input.homeScore} – ${input.awayScore} ${input.awayTeamName}, ${input.periodLabel} — watch: ${watchUrl}`;

    for (const sub of subs) {
      const phone = sub.viewer.phoneE164;
      if (!phone || sub.viewer.smsOptOut) continue;
      try {
        await this.sms.sendNotification(phone, body);
      } catch (error) {
        logger.error({ error, phone, streamId: input.streamId }, 'Score alert SMS failed');
      }
    }
  }
}
