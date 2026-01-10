'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScoreEditModal } from './ScoreEditModal';

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
  canEditScore?: boolean; // Whether user can tap to edit scores
}

export function ScoreboardOverlay({ 
  slug, 
  className, 
  isCollapsed = false, 
  onToggle,
  canEditScore = false 
}: ScoreboardOverlayProps) {
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 16, y: 16 }); // Default top-left
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const scoreboardRef = useRef<HTMLDivElement>(null);
  
  // Score edit modal state
  const [editingTeam, setEditingTeam] = useState<'home' | 'away' | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
  const storageKey = `scoreboard-position-${slug}`;

  // Load position from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {
        // Invalid JSON, use default
      }
    }
  }, [storageKey]);

  // Save position to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || isDragging) return;
    localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey, isDragging]);

  useEffect(() => {
    fetchScoreboard();
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
    } catch {
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

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    e.preventDefault();
    setIsDragging(true);
    const rect = scoreboardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = scoreboardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = Math.max(0, Math.min(window.innerWidth - 200, touch.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragOffset.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Handle score update
  const handleScoreUpdate = async (team: 'home' | 'away', newScore: number) => {
    if (!scoreboard) return;

    try {
      const updateData = team === 'home' 
        ? { homeScore: newScore }
        : { awayScore: newScore };

      const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update score');
      }

      const updated = await response.json();
      setScoreboard(updated);
    } catch (error) {
      console.error('Failed to update score:', error);
      throw error;
    }
  };

  // Handle score tap/click
  const handleScoreTap = (team: 'home' | 'away') => {
    if (!canEditScore) return;
    setEditingTeam(team);
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
        <div className="text-white/80 text-xs font-bold">→</div>
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

  // Expanded state: Draggable scoreboard
  return (
    <>
      <div
        ref={scoreboardRef}
        data-testid="scoreboard-overlay"
        className={cn(
          'fixed z-50 pointer-events-auto select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          isDragging && 'ring-2 ring-accent/50',
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="region"
        aria-label="Game scoreboard (drag to move)"
      >
      <div className="bg-background/95 backdrop-blur-md border-2 border-outline rounded-xl shadow-2xl overflow-hidden">
        {/* Header with drag handle and collapse button */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-outline/50">
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span className="cursor-grab">⋮⋮</span>
            <span>Scoreboard</span>
          </div>
          {onToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              data-testid="btn-collapse-scoreboard"
              aria-label="Collapse scoreboard"
            >
              <span className="text-xs">−</span>
            </button>
          )}
        </div>

        {/* Teams and Scores */}
        <div className="flex">
          {/* Home Team */}
          <div
            data-testid="scoreboard-home-team"
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.homeJerseyColor}ee 0%, ${scoreboard.homeJerseyColor}99 100%)`,
            }}
          >
            <div className="relative z-10 px-3 sm:px-4 md:px-5 py-2 sm:py-3 min-w-[100px] sm:min-w-[120px] md:min-w-[140px]">
              <div 
                data-testid="scoreboard-home-team-name"
                className="text-[10px] sm:text-xs font-semibold text-white/90 uppercase tracking-wider drop-shadow-md mb-0.5"
              >
                {scoreboard.homeTeamName}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleScoreTap('home');
                }}
                disabled={!canEditScore}
                data-testid="scoreboard-home-score"
                className={cn(
                  'text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg tabular-nums',
                  'w-full text-left',
                  canEditScore && 'cursor-pointer hover:scale-110 active:scale-95 transition-transform',
                  !canEditScore && 'cursor-default'
                )}
                aria-label={`Home team score: ${scoreboard.homeScore}${canEditScore ? '. Tap to edit' : ''}`}
              >
                {scoreboard.homeScore}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-black/30" />

          {/* Away Team */}
          <div
            data-testid="scoreboard-away-team"
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${scoreboard.awayJerseyColor}ee 0%, ${scoreboard.awayJerseyColor}99 100%)`,
            }}
          >
            <div className="relative z-10 px-3 sm:px-4 md:px-5 py-2 sm:py-3 min-w-[100px] sm:min-w-[120px] md:min-w-[140px]">
              <div 
                data-testid="scoreboard-away-team-name"
                className="text-[10px] sm:text-xs font-semibold text-white/90 uppercase tracking-wider drop-shadow-md mb-0.5"
              >
                {scoreboard.awayTeamName}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleScoreTap('away');
                }}
                disabled={!canEditScore}
                data-testid="scoreboard-away-score"
                className={cn(
                  'text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg tabular-nums',
                  'w-full text-left',
                  canEditScore && 'cursor-pointer hover:scale-110 active:scale-95 transition-transform',
                  !canEditScore && 'cursor-default'
                )}
                aria-label={`Away team score: ${scoreboard.awayScore}${canEditScore ? '. Tap to edit' : ''}`}
              >
                {scoreboard.awayScore}
              </button>
            </div>
          </div>
        </div>

        {/* Clock */}
        <div className="bg-black/40 px-4 py-2">
          <div className="flex items-center justify-center gap-3">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
              Time
            </div>
            <div 
              data-testid="scoreboard-clock"
              className={cn(
                "text-xl font-mono font-bold tabular-nums text-white",
                scoreboard.clockMode === 'running' && "text-green-400"
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
                className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                aria-label="Clock is running"
              />
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Score Edit Modal */}
      {editingTeam && scoreboard && (
        <ScoreEditModal
          isOpen={true}
          team={editingTeam}
          currentScore={editingTeam === 'home' ? scoreboard.homeScore : scoreboard.awayScore}
          teamName={editingTeam === 'home' ? scoreboard.homeTeamName : scoreboard.awayTeamName}
          onSave={handleScoreUpdate}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </>
  );
}
