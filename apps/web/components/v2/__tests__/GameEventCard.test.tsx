import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameEventCard } from '../chat/GameEventCard';
import type { GameEventPayload } from '@fieldview/data-model';

const pending: GameEventPayload = {
  id: '11111111-1111-4111-8111-111111111111',
  sportId: 'football',
  eventTypeId: 'touchdown',
  label: 'Touchdown',
  icon: 'football',
  category: 'scoring',
  team: 'home',
  status: 'pending',
  confirmationCount: 1,
  confirmationNeeded: 3,
  pointsDelta: 6,
  displayName: 'Alice A.',
  reportedByViewerId: 'viewer-a',
  chatMessageId: 'chat-1',
  createdAt: '2026-08-21T00:00:00.000Z',
};

describe('GameEventCard', () => {
  it('shows confirm count and confirm button for other viewers', () => {
    const onConfirm = vi.fn();
    render(
      <GameEventCard event={pending} viewerId="viewer-b" onConfirm={onConfirm} />
    );
    expect(screen.getByTestId('game-event-label')).toHaveTextContent('Touchdown');
    expect(screen.getByTestId('game-event-confirm-count')).toHaveTextContent('1 of 3');
    fireEvent.click(screen.getByTestId(`btn-confirm-event-${pending.id}`));
    expect(onConfirm).toHaveBeenCalledWith(pending.id);
  });

  it('hides confirm for the reporter', () => {
    render(<GameEventCard event={pending} viewerId="viewer-a" onConfirm={vi.fn()} />);
    expect(screen.queryByTestId(`btn-confirm-event-${pending.id}`)).not.toBeInTheDocument();
  });
});
