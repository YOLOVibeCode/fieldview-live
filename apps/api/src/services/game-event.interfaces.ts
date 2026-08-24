/**
 * Game Event ISP — segregated read/write surfaces for crowdsourced events.
 */

import type { GameEventPayload } from '@fieldview/data-model';
import type { TeamSide } from '@fieldview/data-model';

export type GameEventStatus = 'pending' | 'confirmed' | 'rejected';

export interface StreamContext {
  id: string;
  slug: string;
  gameId: string | null;
  sport: string;
  allowViewerReporting: boolean;
  eventConfirmThreshold: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  period: number;
  periodDetail: string | null;
  clockSeconds: number;
}

export interface StoredGameEvent {
  id: string;
  directStreamId: string;
  sport: string;
  eventType: string;
  team: TeamSide | null;
  pointsDelta: number;
  period: number | null;
  periodDetail: string | null;
  clockSeconds: number | null;
  reportedByViewerId: string;
  displayName: string;
  status: GameEventStatus;
  resolvedBy: string | null;
  chatMessageId: string | null;
  createdAt: Date;
  confirmationCount: number;
  // Narration detail fields
  jerseyNumber: number | null;
  detail: string | null;
  detailValue: number | null;
  note: string | null;
  filmTimeSeconds: number | null;
}

export interface ScoreboardSnapshot {
  homeScore: number;
  awayScore: number;
  period: number;
  periodDetail: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  clockMode: string;
  clockSeconds: number;
  clockStartedAt: Date | null;
  isVisible: boolean;
  position: string;
  lastEditedBy: string | null;
  lastEditedAt: Date | null;
}

export interface IStreamContextReader {
  getBySlug(slug: string): Promise<StreamContext | null>;
}

export interface IGameEventReader {
  getById(id: string): Promise<StoredGameEvent | null>;
  listByStream(streamId: string, status?: GameEventStatus): Promise<StoredGameEvent[]>;
}

export interface IGameEventWriter {
  create(data: Omit<StoredGameEvent, 'confirmationCount' | 'createdAt'> & { createdAt?: Date }): Promise<StoredGameEvent>;
  update(id: string, data: Partial<Pick<StoredGameEvent, 'status' | 'resolvedBy' | 'chatMessageId'>> & { confirmedAt?: Date | null }): Promise<StoredGameEvent>;
}

export interface IGameEventConfirmationWriter {
  add(eventId: string, viewerId: string): Promise<{ created: boolean; count: number }>;
}

export interface IScoreboardMutator {
  applyDeltas(input: {
    streamId: string;
    homeDelta: number;
    awayDelta: number;
    period?: number;
    periodDetail?: string | null;
    lastEditedBy: string;
  }): Promise<ScoreboardSnapshot>;
}

export interface IChatEventWriter {
  createEventMessage(data: {
    gameId: string;
    viewerId: string;
    displayName: string;
    message: string;
    directStreamId: string;
    metadata: GameEventPayload;
  }): Promise<{ id: string }>;
  updateEventMetadata(messageId: string, metadata: GameEventPayload): Promise<void>;
}

export interface IGameEventPublisher {
  publish(gameId: string, payload: GameEventPayload): Promise<void>;
}

export interface IScoreboardBroadcaster {
  publish(slug: string, snapshot: ScoreboardSnapshot, sport: string): void;
}

export interface IScoreAlertFanout {
  notify(input: {
    slug: string;
    streamId: string;
    label: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    periodLabel: string;
  }): Promise<void>;
}

export interface ReportEventInput {
  slug: string;
  viewerId: string;
  displayName: string;
  eventTypeId: string;
  team?: TeamSide;
  clockSeconds?: number;
  jerseyNumber?: number;
  detail?: string;
  detailValue?: number;
  note?: string;
  filmTimeSeconds?: number;
}

export interface ConfirmEventInput {
  slug: string;
  eventId: string;
  viewerId: string;
}

export interface ResolveEventInput {
  slug: string;
  eventId: string;
  action: 'confirm' | 'reject';
  resolverName: string;
}
