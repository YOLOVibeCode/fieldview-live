/**
 * Game Event Service Interface
 *
 * Crowdsourced report / confirm / producer-resolve for live streams.
 */

import type { GameEventPayload } from '@fieldview/data-model';
import type {
  ConfirmEventInput,
  ReportEventInput,
  ResolveEventInput,
  StoredGameEvent,
} from './game-event.interfaces';

export interface ReportEventResult {
  event: StoredGameEvent;
  payload: GameEventPayload;
  applied: boolean;
}

export interface IGameEventService {
  report(input: ReportEventInput): Promise<ReportEventResult>;
  confirm(input: ConfirmEventInput): Promise<ReportEventResult>;
  resolve(input: ResolveEventInput): Promise<ReportEventResult>;
  list(slug: string, status?: 'pending' | 'confirmed' | 'rejected'): Promise<GameEventPayload[]>;
}
