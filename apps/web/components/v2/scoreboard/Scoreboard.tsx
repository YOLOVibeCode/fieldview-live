/**
 * Scoreboard Component
 * 
 * Unified scoreboard for all display modes
 * Supports floating overlay, sidebar, and minimal views
 * 
 * Usage:
 * ```tsx
 * <Scoreboard
 *   mode="floating"
 *   homeTeam={{ name: 'Home', abbreviation: 'HT', score: 42, color: '#3B82F6' }}
 *   awayTeam={{ name: 'Away', abbreviation: 'AT', score: 38, color: '#EF4444' }}
 *   period="1st Half"
 *   time="23:45"
 *   editable
 *   onScoreUpdate={(team, newScore) => updateScore(team, newScore)}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScoreCard } from './ScoreCard';
import { ScoreEditSheet } from './ScoreEditSheet';
import { GameClock } from './GameClock';

export interface TeamData {
  name: string;
  abbreviation?: string;
  score: number;
  color: string;
}

export interface ScoreboardProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  mode?: 'floating' | 'sidebar' | 'minimal';
  editable?: boolean;
  onScoreUpdate?: (team: 'home' | 'away', newScore: number) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * Scoreboard Component
 * 
 * Main scoreboard with multiple display modes and tap-to-edit
 */
export function Scoreboard({
  homeTeam,
  awayTeam,
  period,
  time,
  mode = 'floating',
  editable = false,
  onScoreUpdate,
  className,
  'data-testid': dataTestId,
}: ScoreboardProps) {
  const [editingTeam, setEditingTeam] = useState<'home' | 'away' | null>(null);
  
  // Determine winning team
  const homeWinning = homeTeam.score > awayTeam.score;
  const awayWinning = awayTeam.score > homeTeam.score;
  const isTied = homeTeam.score === awayTeam.score;
  
  const handleSaveScore = async (newScore: number) => {
    if (editingTeam && onScoreUpdate) {
      await onScoreUpdate(editingTeam, newScore);
    }
    setEditingTeam(null);
  };
  
  return (
    <>
      <div
        role="region"
        aria-label="Scoreboard"
        data-testid={dataTestId || 'scoreboard'}
        className={cn(
          // Base styles
          'rounded-xl p-4',
          'bg-[var(--fv-color-bg-secondary)]/90',
          'backdrop-blur-md',
          'border border-[var(--fv-color-border)]',
          
          // Mode-specific styles
          mode === 'floating' && 'floating shadow-lg',
          mode === 'sidebar' && 'sidebar w-full',
          mode === 'minimal' && 'minimal p-3',
          
          className
        )}
      >
        {/* Game Clock (top) */}
        {(period || time) && (
          <div className="mb-4">
            <GameClock
              period={period}
              time={time}
              variant={mode === 'minimal' ? 'compact' : 'default'}
            />
          </div>
        )}
        
        {/* Score Cards */}
        <div className={cn(
          'flex gap-4',
          mode === 'minimal' ? 'gap-2' : 'gap-4',
          mode === 'sidebar' && 'flex-col'
        )}>
          {/* Home Team */}
          <ScoreCard
            teamName={homeTeam.name}
            abbreviation={homeTeam.abbreviation}
            score={homeTeam.score}
            color={homeTeam.color}
            winning={homeWinning && !isTied}
            losing={awayWinning && !isTied}
            variant={mode === 'minimal' ? 'compact' : 'default'}
            editable={editable}
            onTap={() => editable && setEditingTeam('home')}
          />
          
          {/* VS Separator (floating/minimal only) */}
          {mode !== 'sidebar' && (
            <div className="flex items-center justify-center text-[var(--fv-color-text-muted)] font-bold text-sm">
              VS
            </div>
          )}
          
          {/* Away Team */}
          <ScoreCard
            teamName={awayTeam.name}
            abbreviation={awayTeam.abbreviation}
            score={awayTeam.score}
            color={awayTeam.color}
            winning={awayWinning && !isTied}
            losing={homeWinning && !isTied}
            variant={mode === 'minimal' ? 'compact' : 'default'}
            editable={editable}
            onTap={() => editable && setEditingTeam('away')}
          />
        </div>
      </div>
      
      {/* Edit Sheet */}
      {editable && editingTeam && (
        <ScoreEditSheet
          isOpen={editingTeam !== null}
          teamName={editingTeam === 'home' ? homeTeam.name : awayTeam.name}
          currentScore={editingTeam === 'home' ? homeTeam.score : awayTeam.score}
          teamColor={editingTeam === 'home' ? homeTeam.color : awayTeam.color}
          onSave={handleSaveScore}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </>
  );
}

