import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { PeriodLabeler, formatClock, seedClockSeconds, sportRegistry } from '@fieldview/data-model';
import { SportScoreLine } from '../scoreboard/SportScoreLine';
import type { TeamData } from '../scoreboard/Scoreboard';

const homeTeam: TeamData = { name: 'Eagles', abbreviation: 'EAG', score: 14, color: '#003366' };
const awayTeam: TeamData = { name: 'Hawks', abbreviation: 'HWK', score: 7, color: '#CC0000' };

describe('SportScoreLine (overlay variant)', () => {
  it('shows clock for football (down mode)', () => {
    render(
      <SportScoreLine
        sportId="football"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Q2"
        time="10:45"
        variant="overlay"
      />
    );
    expect(screen.getByTestId('overlay-period')).toHaveTextContent('Q2');
    expect(screen.getByTestId('overlay-clock')).toHaveTextContent('10:45');
  });

  it('hides clock for baseball (none mode), still shows period', () => {
    render(
      <SportScoreLine
        sportId="baseball"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Top 3rd"
        time="00:00"
        variant="overlay"
      />
    );
    expect(screen.getByTestId('overlay-period')).toHaveTextContent('Top 3rd');
    expect(screen.queryByTestId('overlay-clock')).not.toBeInTheDocument();
  });

  it('period label is still tappable when crowdsource is enabled', () => {
    const onTapPeriod = vi.fn();
    render(
      <SportScoreLine
        sportId="baseball"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Top 3rd"
        crowdsource={{ enabled: true, onTapTeam: vi.fn(), onTapPeriod }}
        variant="overlay"
      />
    );
    fireEvent.click(screen.getByTestId('btn-overlay-period'));
    expect(onTapPeriod).toHaveBeenCalledTimes(1);
  });

  it('shows soccer up-clock', () => {
    render(
      <SportScoreLine
        sportId="soccer"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="1st"
        time="32:00"
        variant="overlay"
      />
    );
    expect(screen.getByTestId('overlay-clock')).toHaveTextContent('32:00');
  });

  it('crowdsource taps fire correct callbacks', () => {
    const onTapTeam = vi.fn();
    const onTapPeriod = vi.fn();
    render(
      <SportScoreLine
        sportId="football"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Q1"
        crowdsource={{ enabled: true, onTapTeam, onTapPeriod }}
        variant="overlay"
      />
    );
    fireEvent.click(screen.getByTestId('btn-overlay-team-home'));
    expect(onTapTeam).toHaveBeenCalledWith('home');
    fireEvent.click(screen.getByTestId('btn-overlay-team-away'));
    expect(onTapTeam).toHaveBeenCalledWith('away');
    fireEvent.click(screen.getByTestId('btn-overlay-period'));
    expect(onTapPeriod).toHaveBeenCalledTimes(1);
  });

  it('does not render tap targets when crowdsource is off', () => {
    render(
      <SportScoreLine
        sportId="football"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Q1"
        variant="overlay"
      />
    );
    expect(screen.queryByTestId('btn-overlay-team-home')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-overlay-team-away')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-overlay-period')).not.toBeInTheDocument();
  });
});

describe('SportScoreLine (bar variant)', () => {
  it('shows clock for soccer (up mode)', () => {
    render(
      <SportScoreLine
        sportId="soccer"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="H1"
        time="45:00"
        variant="bar"
      />
    );
    expect(screen.getByTestId('overlay-period')).toHaveTextContent('H1');
    expect(screen.getByTestId('overlay-clock')).toHaveTextContent('45:00');
  });

  it('hides clock for baseball (none mode)', () => {
    render(
      <SportScoreLine
        sportId="baseball"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="Bot 7th"
        time="00:00"
        variant="bar"
      />
    );
    expect(screen.getByTestId('overlay-period')).toHaveTextContent('Bot 7th');
    expect(screen.queryByTestId('overlay-clock')).not.toBeInTheDocument();
  });

  it('crowdsource taps work in bar variant', () => {
    const onTapTeam = vi.fn();
    const onTapPeriod = vi.fn();
    render(
      <SportScoreLine
        sportId="soccer"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period="H1"
        time="22:00"
        crowdsource={{ enabled: true, onTapTeam, onTapPeriod }}
        variant="bar"
      />
    );
    fireEvent.click(screen.getByTestId('btn-overlay-team-home'));
    expect(onTapTeam).toHaveBeenCalledWith('home');
    fireEvent.click(screen.getByTestId('btn-overlay-period'));
    expect(onTapPeriod).toHaveBeenCalledTimes(1);
  });

  it('keeps a period tap target for clockless sports with no time', () => {
    const onTapPeriod = vi.fn();
    render(
      <SportScoreLine
        sportId="baseball"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        crowdsource={{ enabled: true, onTapTeam: vi.fn(), onTapPeriod }}
        variant="bar"
      />
    );
    fireEvent.click(screen.getByTestId('btn-overlay-period'));
    expect(onTapPeriod).toHaveBeenCalledTimes(1);
  });
});

describe('SportScoreLine catalog lines', () => {
  const periodLabeler = new PeriodLabeler(sportRegistry);

  it.each(sportRegistry.listSports().map((sport) => [sport.id, sport.displayName]))(
    '%s overlay shows period and hides clock only when catalog says none',
    (sportId) => {
      const sport = sportRegistry.getSport(sportId);
      const period = periodLabeler.formatPeriod(sportId, 1, sport.periods.supportsPeriodDetail ? 'top' : null);
      const time = formatClock(seedClockSeconds(sport));

      render(
        <SportScoreLine
          sportId={sportId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          time={time}
          variant="overlay"
        />
      );

      expect(screen.getByTestId('overlay-period')).toHaveTextContent(period);
      if (sport.clock.mode === 'none') {
        expect(screen.queryByTestId('overlay-clock')).not.toBeInTheDocument();
      } else {
        expect(screen.getByTestId('overlay-clock')).toHaveTextContent(time);
      }
    }
  );
});
