'use client';

import { cn } from '@/lib/utils';
import type { GameEventPayload } from '@fieldview/data-model';

export interface GameEventCardProps {
  event: GameEventPayload;
  viewerId?: string;
  isProducer?: boolean;
  onConfirm?: (eventId: string) => void;
  onResolve?: (eventId: string, action: 'confirm' | 'reject') => void;
}

export function GameEventCard({
  event,
  viewerId,
  isProducer = false,
  onConfirm,
  onResolve,
}: GameEventCardProps) {
  const pending = event.status === 'pending';
  const confirmed = event.status === 'confirmed';
  const rejected = event.status === 'rejected';
  const alreadyOwn = viewerId === event.reportedByViewerId;
  const teamLabel = event.team ? event.team.toUpperCase() : null;

  return (
    <article
      role="article"
      data-testid={`game-event-card-${event.id}`}
      data-status={event.status}
      className={cn(
        'mx-2 my-1 rounded-lg border px-3 py-2 text-sm',
        pending && 'border-amber-500/50 bg-amber-950/40',
        confirmed && 'border-emerald-500/50 bg-emerald-950/40',
        rejected && 'border-zinc-600 bg-zinc-900/60 opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white" data-testid="game-event-label">
            {event.label}
            {teamLabel ? ` — ${teamLabel}` : ''}
          </p>
          <p className="text-xs text-white/70">
            reported by {event.displayName}
          </p>
        </div>
        {pending && (
          <span className="shrink-0 text-xs text-amber-300" data-testid="game-event-confirm-count">
            {event.confirmationCount} of {event.confirmationNeeded}
          </span>
        )}
        {confirmed && (
          <span className="shrink-0 text-xs text-emerald-300">Confirmed</span>
        )}
        {rejected && (
          <span className="shrink-0 text-xs text-zinc-400">Rejected</span>
        )}
      </div>

      {pending && (
        <div className="mt-2 flex gap-2">
          {!alreadyOwn && onConfirm && (
            <button
              type="button"
              data-testid={`btn-confirm-event-${event.id}`}
              onClick={() => onConfirm(event.id)}
              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
              aria-label="Confirm this event"
            >
              Confirm
            </button>
          )}
          {isProducer && onResolve && (
            <>
              <button
                type="button"
                data-testid={`btn-producer-confirm-event-${event.id}`}
                onClick={() => onResolve(event.id, 'confirm')}
                className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white"
              >
                Apply
              </button>
              <button
                type="button"
                data-testid={`btn-producer-reject-event-${event.id}`}
                onClick={() => onResolve(event.id, 'reject')}
                className="rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-white"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
