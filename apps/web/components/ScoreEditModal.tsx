/**
 * ScoreEditModal Component
 * 
 * Modal for editing scoreboard scores via tap/click interaction.
 * Mobile-optimized with 44px minimum touch targets.
 * 
 * Usage:
 * ```tsx
 * <ScoreEditModal
 *   isOpen={isOpen}
 *   team="home"
 *   currentScore={5}
 *   teamName="Home Team"
 *   onSave={(team, newScore) => handleScoreUpdate(team, newScore)}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ScoreEditModalProps {
  isOpen: boolean;
  team: 'home' | 'away';
  currentScore: number;
  teamName: string;
  onSave: (team: 'home' | 'away', newScore: number) => Promise<void> | void;
  onClose: () => void;
}

export function ScoreEditModal({
  isOpen,
  team,
  currentScore,
  teamName,
  onSave,
  onClose,
}: ScoreEditModalProps) {
  const [score, setScore] = useState(currentScore);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update score when modal opens with new value
  useEffect(() => {
    setScore(currentScore);
  }, [currentScore, isOpen]);

  // Auto-focus and select input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clamp score to valid range (0-999)
    const validScore = Math.max(0, Math.min(999, score));
    
    setIsSaving(true);
    try {
      await onSave(team, validScore);
      onClose();
    } catch (error) {
      console.error('Failed to save score:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user to clear input
    if (value === '') {
      setScore(0);
      return;
    }
    // Parse the value, default to 0 if invalid
    const parsed = parseInt(value, 10);
    setScore(isNaN(parsed) ? 0 : parsed);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200"
        data-testid="modal-score-edit"
        role="dialog"
        aria-labelledby="score-edit-title"
        aria-modal="true"
      >
        <div className="bg-background border-2 border-outline rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-elevated border-b border-outline px-6 py-4">
            <h2
              id="score-edit-title"
              className="text-xl font-bold text-white"
            >
              Edit {teamName} Score
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tap to select, then enter the new score
            </p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="score-input"
                className="text-sm font-medium text-white"
              >
                Score
              </label>
              <Input
                ref={inputRef}
                id="score-input"
                data-testid="input-score-edit"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={score}
                onChange={handleScoreChange}
                disabled={isSaving}
                min={0}
                max={999}
                className={cn(
                  'text-center text-4xl font-bold h-20',
                  'bg-elevated border-2 border-outline',
                  'focus:border-accent focus:ring-2 focus:ring-accent/20',
                  'transition-all'
                )}
                aria-label={`Edit ${teamName} score`}
              />
              <p className="text-xs text-muted-foreground text-center">
                Current: {currentScore}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                data-testid="btn-cancel-score"
                className="flex-1 min-h-[48px] text-base font-semibold"
                aria-label="Cancel score edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="btn-save-score"
                className={cn(
                  'flex-1 min-h-[48px] text-base font-semibold',
                  'bg-accent hover:bg-accent/90',
                  'transition-colors'
                )}
                aria-label="Save new score"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

