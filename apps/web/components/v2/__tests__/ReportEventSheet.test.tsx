import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReportEventSheet } from '../chat/ReportEventSheet';

describe('ReportEventSheet', () => {
  const onReport = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    onReport.mockClear();
    onClose.mockClear();
  });

  it('period event (no detailOptions) reports on one tap', () => {
    render(
      <ReportEventSheet
        isOpen
        onClose={onClose}
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
        category="period"
        onReport={onReport}
      />
    );
    expect(screen.getByTestId('btn-event-type-quarter_end')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-event-type-touchdown')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-event-type-quarter_end'));
    expect(onReport).toHaveBeenCalledWith('quarter_end');
  });

  it('renders lucide icons from the catalog', () => {
    render(
      <ReportEventSheet
        isOpen
        onClose={onClose}
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
        category="scoring"
        preselectedTeam="away"
        onReport={onReport}
      />
    );
    expect(screen.getByTestId('icon-event-touchdown')).toBeInTheDocument();
  });

  describe('detail step', () => {
    it('preselected team + event with detailOptions opens the detail step', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      // touchdown has detailOptions → should open detail step
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      expect(screen.getByTestId('report-detail-step')).toBeInTheDocument();
      expect(onReport).not.toHaveBeenCalled();
    });

    it('Report button submits with detail fields', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      // Fill jersey
      fireEvent.change(screen.getByTestId('input-jersey-number'), { target: { value: '12' } });
      // Select 'run' chip
      fireEvent.click(screen.getByTestId('chip-detail-run'));
      // Fill yardage
      fireEvent.change(screen.getByTestId('input-detail-value'), { target: { value: '18' } });
      // Submit
      fireEvent.click(screen.getByTestId('btn-report-with-detail'));

      expect(onReport).toHaveBeenCalledWith(
        'touchdown',
        'home',
        expect.objectContaining({ jerseyNumber: 12, detail: 'run', detailValue: 18 })
      );
    });

    it('Skip button calls onReport without detail fields', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      fireEvent.click(screen.getByTestId('btn-skip-detail'));
      // Called without detail
      expect(onReport).toHaveBeenCalledWith('touchdown', 'home');
    });

    it('detail chips are rendered from sport catalog', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      expect(screen.getByTestId('chip-detail-run')).toBeInTheDocument();
      expect(screen.getByTestId('chip-detail-pass')).toBeInTheDocument();
    });

    it('yards input shown when a unit=yards chip is selected', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      expect(screen.queryByTestId('input-detail-value')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('chip-detail-run'));
      expect(screen.getByTestId('input-detail-value')).toBeInTheDocument();
    });

    it('note input max 80 chars shown in detail step', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      const noteInput = screen.getByTestId('input-note');
      expect(noteInput).toBeInTheDocument();
      expect(noteInput).toHaveAttribute('maxlength', '80');
    });

    it('Back button from detail step returns to event list (preselectedTeam)', () => {
      render(
        <ReportEventSheet
          isOpen
          onClose={onClose}
          sportId="football"
          homeTeamName="Eagles"
          awayTeamName="Hawks"
          category="scoring"
          preselectedTeam="home"
          onReport={onReport}
        />
      );
      fireEvent.click(screen.getByTestId('btn-event-type-touchdown'));
      expect(screen.getByTestId('report-detail-step')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('btn-back-from-detail'));
      expect(screen.queryByTestId('report-detail-step')).not.toBeInTheDocument();
      expect(screen.getByTestId('btn-event-type-touchdown')).toBeInTheDocument();
    });
  });
});
