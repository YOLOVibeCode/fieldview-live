'use client';

import type { OverlayPendingEvent } from './overlayCrowdsource';

export function PendingEventChip({
  event,
  viewerId,
  onConfirm,
}: {
  event: OverlayPendingEvent;
  viewerId?: string;
  onConfirm: (eventId: string) => void;
}) {
  const canConfirm = viewerId !== undefined && viewerId !== event.reportedByViewerId;
  const teamSuffix = event.team ? ` ${event.team.toUpperCase()}` : '';

  return (
    <div
      data-testid="chip-pending-event"
      className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-semibold text-black shadow"
    >
      <span>
        {event.label}
        {teamSuffix}? {event.confirmationCount}/{event.confirmationNeeded}
      </span>
      {canConfirm && (
        <button
          type="button"
          data-testid="btn-confirm-pending-event"
          aria-label={`Confirm ${event.label}`}
          onClick={(e) => {
            e.stopPropagation();
            onConfirm(event.id);
          }}
          className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200"
        >
          Confirm
        </button>
      )}
    </div>
  );
}
