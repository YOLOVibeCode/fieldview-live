'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * ISP: Segregated interfaces for scoreboard data and rendering
 */

export interface GameScoreboard {
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

export interface IScoreboardDataSource {
  fetchScoreboard(): Promise<GameScoreboard | null>;
}

export interface IScoreboardRenderer {
  renderCollapsed(score: string, onToggle: () => void): React.ReactNode;
  renderExpanded(scoreboard: GameScoreboard, onToggle: () => void): React.ReactNode;
}

interface CollapsibleScoreboardOverlayProps {
  slug: string;
  isVisible: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
  isFullscreen: boolean;
}

export function CollapsibleScoreboardOverlay({
  slug,
  isVisible,
  onToggle,
  position = 'left',
  isFullscreen,
}: CollapsibleScoreboardOverlayProps) {
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

  // Only render in fullscreen mode
  if (!isFullscreen) {
    return null;
  }

  useEffect(() => {
    fetchScoreboard();
    
    // Poll for updates every 2 seconds (4s on mobile)
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
    const interval = setInterval(fetchScoreboard, isMobile ? 4000 : 2000);
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

  const getScoreBadge = (): string => {
    if (!scoreboard) return '0-0';
    return `${scoreboard.homeScore}-${scoreboard.awayScore}`;
  };

  // Don't show if loading or scoreboard is disabled
  if (loading || !scoreboard || !scoreboard.isVisible) {
    return null;
  }

  // Collapsed: Minimized toggle button
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={`
          fixed ${position === 'left' ? 'left-4' : 'right-4'} bottom-4
          z-50
          bg-accent/90 backdrop-blur-md
          text-white
          px-4 py-2 rounded-full
          font-medium text-sm
          shadow-xl
          hover:scale-105 active:scale-95
          transition-all duration-200
          flex items-center gap-2
          border border-accent/30
        `}
        data-testid="btn-toggle-scoreboard"
        aria-label="Toggle scoreboard overlay"
      >
        <span className="text-lg">📊</span>
        <span className="hidden sm:inline">Score</span>
        <span 
          className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold"
          data-testid="scoreboard-score-badge"
        >
          {getScoreBadge()}
        </span>
      </button>
    );
  }

  // Expanded: Full-height sidebar panel
  return (
    <div
      className={`
        fixed inset-y-0 ${position === 'left' ? 'left-0' : 'right-0'}
        z-50
        w-full sm:w-80 md:w-96
        pointer-events-none
      `}
      data-testid="overlay-scoreboard"
      role="region"
      aria-label="Game scoreboard"
    >
      {/* Gradient background - translucent to see video action */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-b from-transparent via-black/40 to-black/85
          backdrop-blur-sm
        `}
      />

      {/* Scoreboard content */}
      <div className="relative h-full flex flex-col pointer-events-auto">
        {/* Header - Minimal, semi-transparent */}
        <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
          <h2 className="text-white font-bold text-lg">Scoreboard</h2>
          <button
            onClick={onToggle}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="btn-close-scoreboard"
            aria-label="Close scoreboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scoreboard content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          {/* Home Team Card */}
          <div
            data-testid="scoreboard-home-team-card"
            className="w-full bg-background/80 backdrop-blur-md border border-outline/50 rounded-lg shadow-xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.homeJerseyColor}ee 0%, ${scoreboard.homeJerseyColor}aa 100%)`,
            }}
          >
            <div className="p-6 text-center">
              <div 
                data-testid="scoreboard-home-team-name"
                className="text-sm font-semibold text-white uppercase tracking-wide drop-shadow-md mb-2"
              >
                {scoreboard.homeTeamName}
              </div>
              <div 
                data-testid="scoreboard-home-score"
                className="text-5xl font-bold text-white drop-shadow-lg"
                aria-label={`Home team score: ${scoreboard.homeScore}`}
              >
                {scoreboard.homeScore}
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-white/60 font-bold text-xl">VS</div>

          {/* Away Team Card */}
          <div
            data-testid="scoreboard-away-team-card"
            className="w-full bg-background/80 backdrop-blur-md border border-outline/50 rounded-lg shadow-xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.awayJerseyColor}ee 0%, ${scoreboard.awayJerseyColor}aa 100%)`,
            }}
          >
            <div className="p-6 text-center">
              <div 
                data-testid="scoreboard-away-team-name"
                className="text-sm font-semibold text-white uppercase tracking-wide drop-shadow-md mb-2"
              >
                {scoreboard.awayTeamName}
              </div>
              <div 
                data-testid="scoreboard-away-score"
                className="text-5xl font-bold text-white drop-shadow-lg"
                aria-label={`Away team score: ${scoreboard.awayScore}`}
              >
                {scoreboard.awayScore}
              </div>
            </div>
          </div>

          {/* Clock */}
          <div className="w-full bg-elevated/90 backdrop-blur-md border border-outline/50 rounded-lg p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted uppercase tracking-wide font-semibold">
                Game Clock
              </div>
              <div className="flex items-center gap-3">
                <div 
                  data-testid="scoreboard-clock"
                  className={cn(
                    "text-3xl font-mono font-bold tabular-nums text-white",
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
                    className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
                    aria-label="Clock is running"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="p-4 text-center text-white/40 text-xs">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">S</kbd> to toggle
        </div>
      </div>
    </div>
  );
}

