'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GameScoreboard {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  homeScore: number;
  awayScore: number;
  clockMode: 'stopped' | 'running' | 'paused';
  clockSeconds: number;
  clockStartedAt: string | null;
  isVisible: boolean;
  position: string;
}

interface ScoreboardOverlayProps {
  slug: string;
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function ScoreboardOverlay({ slug, className, isCollapsed = false, onToggle }: ScoreboardOverlayProps) {
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

  useEffect(() => {
    fetchScoreboard();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchScoreboard, 2000);
    return () => clearInterval(interval);
  }, [slug]);

  const fetchScoreboard = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard`);
      
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      setScoreboard(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const getCurrentClockSeconds = (): number => {
    if (!scoreboard) return 0;
    
    if (scoreboard.clockMode === 'running' && scoreboard.clockStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(scoreboard.clockStartedAt).getTime()) / 1000);
      return scoreboard.clockSeconds + elapsed;
    }
    
    return scoreboard.clockSeconds;
  };

  useEffect(() => {
    if (scoreboard?.clockMode === 'running') {
      const interval = setInterval(() => {
        setDisplayTime(getCurrentClockSeconds());
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayTime(getCurrentClockSeconds());
    }
  }, [scoreboard]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPositionClasses = (position: string): string => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 left-4';
    }
  };

  const getScoreBadge = (): string => {
    if (!scoreboard) return '0-0';
    return `${scoreboard.homeScore}-${scoreboard.awayScore}`;
  };

  if (loading || !scoreboard || !scoreboard.isVisible) {
    return null;
  }

  // Collapsed state: Left-edge tab
  if (isCollapsed) {
    return (
      <div
        data-testid="scoreboard-collapsed-tab"
        className={cn(
          'fixed left-0 top-1/2 -translate-y-1/2 z-50',
          'w-12 py-4',
          'bg-background/95 backdrop-blur-sm',
          'border-r-2 border-outline',
          'rounded-r-lg',
          'shadow-xl',
          'cursor-pointer pointer-events-auto',
          'hover:bg-background hover:w-14',
          'transition-all duration-200',
          'flex flex-col items-center gap-2',
          className
        )}
        onClick={onToggle}
        role="button"
        aria-label="Expand scoreboard"
      >
        <div className="text-white/80 text-xs font-bold">←</div>
        <div className="text-2xl">📊</div>
        <div 
          className="text-white font-bold text-xs"
          data-testid="scoreboard-collapsed-badge"
        >
          {getScoreBadge()}
        </div>
        {scoreboard.clockMode === 'running' && (
          <div className="text-accent text-xs font-mono">
            {formatTime(displayTime)}
          </div>
        )}
      </div>
    );
  }

  // Expanded state: Traditional overlay with slide animation
  return (
    <div
      data-testid="scoreboard-overlay"
      className={cn(
        'fixed z-50 pointer-events-none select-none',
        getPositionClasses(scoreboard.position),
        className
      )}
      role="region"
      aria-label="Game scoreboard"
    >
      <div className="bg-background/95 backdrop-blur-sm border-2 border-outline rounded-lg shadow-2xl overflow-hidden relative">
        {/* Collapse button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -left-10 top-2 w-8 h-8 bg-background/95 backdrop-blur-sm border border-outline rounded-l-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-background transition-colors"
            data-testid="btn-collapse-scoreboard"
            aria-label="Collapse scoreboard"
          >
            <span className="text-xs font-bold">←</span>
          </button>
        )}
        
        {/* Teams and Scores */}
        <div className="flex divide-x divide-outline">
          {/* Home Team */}
          <div
            data-testid="scoreboard-home-team"
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.homeJerseyColor}ee 0%, ${scoreboard.homeJerseyColor}cc 100%)`,
            }}
          >
            <div className="relative z-10 px-6 py-4 min-w-[180px]">
              <div 
                data-testid="scoreboard-home-team-name"
                className="text-sm font-semibold text-white uppercase tracking-wide drop-shadow-md mb-1"
              >
                {scoreboard.homeTeamName}
              </div>
              <div 
                data-testid="scoreboard-home-score"
                className="text-4xl font-bold text-white drop-shadow-lg"
                aria-label={`Home team score: ${scoreboard.homeScore}`}
              >
                {scoreboard.homeScore}
              </div>
            </div>
            {/* Jersey color indicator */}
            <div 
              className="absolute top-0 right-0 w-1 h-full"
              style={{ backgroundColor: scoreboard.homeJerseyColor }}
              aria-hidden="true"
            />
          </div>

          {/* Away Team */}
          <div
            data-testid="scoreboard-away-team"
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.awayJerseyColor}ee 0%, ${scoreboard.awayJerseyColor}cc 100%)`,
            }}
          >
            <div className="relative z-10 px-6 py-4 min-w-[180px]">
              <div 
                data-testid="scoreboard-away-team-name"
                className="text-sm font-semibold text-white uppercase tracking-wide drop-shadow-md mb-1"
              >
                {scoreboard.awayTeamName}
              </div>
              <div 
                data-testid="scoreboard-away-score"
                className="text-4xl font-bold text-white drop-shadow-lg"
                aria-label={`Away team score: ${scoreboard.awayScore}`}
              >
                {scoreboard.awayScore}
              </div>
            </div>
            {/* Jersey color indicator */}
            <div 
              className="absolute top-0 right-0 w-1 h-full"
              style={{ backgroundColor: scoreboard.awayJerseyColor }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Clock */}
        <div className="bg-elevated border-t-2 border-outline px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted uppercase tracking-wide font-semibold">
              Time
            </div>
            <div 
              data-testid="scoreboard-clock"
              className={cn(
                "text-2xl font-mono font-bold tabular-nums",
                scoreboard.clockMode === 'running' && "text-accent animate-pulse"
              )}
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Game clock: ${formatTime(displayTime)}`}
            >
              {formatTime(displayTime)}
            </div>
            {scoreboard.clockMode === 'running' && (
              <div 
                data-testid="scoreboard-clock-indicator"
                className="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                aria-label="Clock is running"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

