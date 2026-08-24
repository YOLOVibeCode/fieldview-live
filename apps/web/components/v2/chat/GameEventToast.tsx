'use client';

import { AdminBroadcast } from './AdminBroadcast';
import type { GameEventPayload } from '@fieldview/data-model';

export interface GameEventToastProps {
  event: GameEventPayload;
  homeTeamName?: string;
  awayTeamName?: string;
  onDismiss: () => void;
}

export function GameEventToast({ event, homeTeamName, awayTeamName, onDismiss }: GameEventToastProps) {
  const teamName =
    event.team === 'home' ? homeTeamName ?? 'Home' : event.team === 'away' ? awayTeamName ?? 'Away' : null;
  const message = teamName ? `${event.label} — ${teamName}` : event.label;
  return (
    <div data-testid="game-event-toast">
      <AdminBroadcast message={message} onDismiss={onDismiss} autoHideSeconds={8} />
    </div>
  );
}
