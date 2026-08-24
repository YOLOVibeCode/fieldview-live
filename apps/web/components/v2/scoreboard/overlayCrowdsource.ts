import type { GameEventPayload } from '@fieldview/data-model';

/** Pending scoring/period event shown as a confirm chip on the overlay. */
export interface OverlayPendingEvent {
  id: string;
  label: string;
  team: 'home' | 'away' | null;
  confirmationCount: number;
  confirmationNeeded: number;
  reportedByViewerId: string;
}

export interface OverlayCrowdsourceProps {
  enabled: boolean;
  pendingEvent?: OverlayPendingEvent | null;
  viewerId?: string;
  onTapTeam: (team: 'home' | 'away') => void;
  onTapPeriod: () => void;
  onConfirmPending: (eventId: string) => void;
}

export function toOverlayPendingEvent(
  event: Pick<
    GameEventPayload,
    | 'id'
    | 'label'
    | 'team'
    | 'confirmationCount'
    | 'confirmationNeeded'
    | 'reportedByViewerId'
  >
): OverlayPendingEvent {
  return {
    id: event.id,
    label: event.label,
    team: event.team,
    confirmationCount: event.confirmationCount,
    confirmationNeeded: event.confirmationNeeded,
    reportedByViewerId: event.reportedByViewerId,
  };
}
