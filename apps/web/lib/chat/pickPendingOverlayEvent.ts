import type { GameEventPayload } from '@fieldview/data-model';

export interface OverlayEventMessage {
  gameEvent?: GameEventPayload;
}

/** Latest pending scoring/period event for the overlay confirm chip. */
export function pickPendingOverlayEvent(
  messages: OverlayEventMessage[]
): GameEventPayload | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const event = messages[i]?.gameEvent;
    if (!event) continue;
    if (event.status !== 'pending') continue;
    if (event.category === 'hype') continue;
    return event;
  }
  return null;
}
