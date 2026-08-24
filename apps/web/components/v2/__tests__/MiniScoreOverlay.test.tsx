import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MiniScoreOverlay } from '../scoreboard/MiniScoreOverlay';
import type { OverlayCrowdsourceProps } from '../scoreboard/overlayCrowdsource';
import type { TeamData } from '../scoreboard/Scoreboard';

const homeTeam: TeamData = {
  name: 'Eagles',
  abbreviation: 'EAG',
  score: 14,
  color: '#003366',
};

const awayTeam: TeamData = {
  name: 'Hawks',
  abbreviation: 'HWK',
  score: 7,
  color: '#CC0000',
};

function crowdsource(
  overrides: Partial<OverlayCrowdsourceProps> = {}
): OverlayCrowdsourceProps {
  return {
    enabled: true,
    onTapTeam: vi.fn(),
    onTapPeriod: vi.fn(),
    onConfirmPending: vi.fn(),
    ...overrides,
  };
}

describe('MiniScoreOverlay', () => {
  describe('period and clock contract', () => {
    it('shows period and clock when both are provided', () => {
      render(
        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period="Q2"
          time="08:12"
        />
      );
      expect(screen.getByTestId('overlay-period')).toHaveTextContent('Q2');
      expect(screen.getByTestId('overlay-clock')).toHaveTextContent('08:12');
    });

    it('shows period only when time is omitted (clockless sport)', () => {
      render(
        <MiniScoreOverlay homeTeam={homeTeam} awayTeam={awayTeam} period="Top 3rd" />
      );
      expect(screen.getByTestId('overlay-period')).toHaveTextContent('Top 3rd');
      expect(screen.queryByTestId('overlay-clock')).not.toBeInTheDocument();
    });
  });

  describe('display-only (crowdsource off)', () => {
    it('does not render overlay tap targets', () => {
      render(
        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period="Q2"
          time="08:12"
        />
      );
      expect(screen.queryByTestId('btn-overlay-team-home')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-overlay-team-away')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-overlay-period')).not.toBeInTheDocument();
    });
  });

  describe('crowdsource taps', () => {
    it('tapping home reports for home', () => {
      const cs = crowdsource();
      render(
        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period="Q2"
          time="08:12"
          crowdsource={cs}
        />
      );
      fireEvent.click(screen.getByTestId('btn-overlay-team-home'));
      expect(cs.onTapTeam).toHaveBeenCalledWith('home');
      expect(cs.onTapPeriod).not.toHaveBeenCalled();
    });

    it('tapping away reports for away', () => {
      const cs = crowdsource();
      render(
        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          crowdsource={cs}
        />
      );
      fireEvent.click(screen.getByTestId('btn-overlay-team-away'));
      expect(cs.onTapTeam).toHaveBeenCalledWith('away');
    });

    it('tapping period/clock opens period events', () => {
      const cs = crowdsource();
      render(
        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period="Q2"
          time="08:12"
          crowdsource={cs}
        />
      );
      fireEvent.click(screen.getByTestId('btn-overlay-period'));
      expect(cs.onTapPeriod).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending confirm chip', () => {
    const pending = {
      id: '11111111-1111-4111-8111-111111111111',
      label: 'Touchdown',
      team: 'home' as const,
      confirmationCount: 1,
      confirmationNeeded: 2,
      reportedByViewerId: 'viewer-a',
    };

    it('lets another viewer confirm in one tap', () => {
      const cs = crowdsource({ pendingEvent: pending, viewerId: 'viewer-b' });
      render(
        <MiniScoreOverlay homeTeam={homeTeam} awayTeam={awayTeam} crowdsource={cs} />
      );
      expect(screen.getByTestId('chip-pending-event')).toHaveTextContent('Touchdown');
      fireEvent.click(screen.getByTestId('btn-confirm-pending-event'));
      expect(cs.onConfirmPending).toHaveBeenCalledWith(pending.id);
    });

    it('hides confirm for the reporter', () => {
      const cs = crowdsource({ pendingEvent: pending, viewerId: 'viewer-a' });
      render(
        <MiniScoreOverlay homeTeam={homeTeam} awayTeam={awayTeam} crowdsource={cs} />
      );
      expect(screen.getByTestId('chip-pending-event')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-confirm-pending-event')).not.toBeInTheDocument();
    });
  });
});
