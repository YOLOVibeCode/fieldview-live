import { describe, it, expect } from 'vitest';
import type { GameEventPayload } from '@fieldview/data-model';
import { pickPendingOverlayEvent } from '../pickPendingOverlayEvent';

function event(partial: Partial<GameEventPayload> & Pick<GameEventPayload, 'id' | 'status' | 'category'>): GameEventPayload {
  return {
    sportId: 'football',
    eventTypeId: 'touchdown',
    label: 'Touchdown',
    icon: 'zap',
    team: 'home',
    confirmationCount: 1,
    confirmationNeeded: 2,
    pointsDelta: 6,
    displayName: 'Alice',
    reportedByViewerId: 'viewer-a',
    chatMessageId: null,
    createdAt: '2026-08-21T00:00:00.000Z',
    ...partial,
  };
}

describe('pickPendingOverlayEvent', () => {
  it('returns the latest pending scoring or period event', () => {
    const older = event({ id: '11111111-1111-4111-8111-111111111111', status: 'pending', category: 'scoring' });
    const newer = event({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'pending',
      category: 'period',
      label: 'End of Quarter',
      eventTypeId: 'quarter_end',
    });
    const picked = pickPendingOverlayEvent([{ gameEvent: older }, { gameEvent: newer }]);
    expect(picked?.id).toBe(newer.id);
  });

  it('skips hype and confirmed events', () => {
    const hype = event({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'pending',
      category: 'hype',
      label: 'Big Play',
    });
    const confirmed = event({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'confirmed',
      category: 'scoring',
    });
    expect(pickPendingOverlayEvent([{ gameEvent: hype }, { gameEvent: confirmed }])).toBeNull();
  });
});
