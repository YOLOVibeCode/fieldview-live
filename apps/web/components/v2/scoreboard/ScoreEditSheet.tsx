/**
 * ScoreEditSheet Component
 * 
 * Bottom sheet for editing team scores
 * Mobile-optimized with quick increment buttons
 * 
 * Usage:
 * ```tsx
 * <ScoreEditSheet
 *   isOpen={isOpen}
 *   teamName="Home Team"
 *   currentScore={42}
 *   teamColor="#3B82F6"
 *   onSave={(newScore) => updateScore(newScore)}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';

export interface ScoreEditSheetProps {
  isOpen: boolean;
  teamName: string;
  currentScore: number;
  teamColor: string;
  onSave: (newScore: number) => void;
  onClose: () => void;
}

/**
 * ScoreEditSheet Component
 * 
 * Edit team score with quick increment buttons and manual input
 */
export function ScoreEditSheet({
  isOpen,
  teamName,
  currentScore,
  teamColor,
  onSave,
  onClose,
}: ScoreEditSheetProps) {
  const [score, setScore] = useState(currentScore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Reset score and error when sheet opens
  useEffect(() => {
    if (isOpen) {
      setScore(currentScore);
      setError(null);
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 300);
    }
  }, [isOpen, currentScore]);
  
  const handleIncrement = (amount: number) => {
    setScore((prev) => Math.max(0, prev + amount));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow non-negative integers
    if (/^\d*$/.test(value)) {
      setScore(value === '' ? 0 : parseInt(value, 10));
    }
  };
  
  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onSave(score);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save score';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.5]}
      initialSnap={0}
      enableDrag={true}
      enableBackdrop={true}
      aria-labelledby="score-edit-title"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2
            id="score-edit-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            {teamName}
          </h2>
          <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
            Edit Score
          </p>
        </div>
        
        {/* Score Input */}
        <div className="flex justify-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={score}
            onChange={handleInputChange}
            className="w-32 h-24 text-6xl font-bold text-center rounded-xl border-2 bg-[var(--fv-color-bg-elevated)] text-[var(--fv-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              borderColor: teamColor,
              color: teamColor,
            }}
            aria-label={`Score for ${teamName}`}
          />
        </div>
        
        {/* Quick Increment Buttons */}
        <div className="flex justify-center gap-3">
          <TouchButton
            variant="outline"
            size="lg"
            onClick={() => handleIncrement(1)}
            className="min-w-[80px]"
          >
            +1
          </TouchButton>
          <TouchButton
            variant="outline"
            size="lg"
            onClick={() => handleIncrement(2)}
            className="min-w-[80px]"
          >
            +2
          </TouchButton>
          <TouchButton
            variant="outline"
            size="lg"
            onClick={() => handleIncrement(3)}
            className="min-w-[80px]"
          >
            +3
          </TouchButton>
        </div>
        
        {/* Error Message */}
        {error && (
          <div
            data-testid="error-message"
            className="p-3 rounded-lg bg-red-50 border border-red-200"
            role="alert"
          >
            <p className="text-sm text-red-600 font-medium text-center">
              {error}
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <TouchButton
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </TouchButton>
          {error ? (
            <TouchButton
              variant="primary"
              size="lg"
              onClick={handleSave}
              className="flex-1"
              data-testid="btn-retry"
              disabled={isLoading}
              data-loading={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Retry'}
            </TouchButton>
          ) : (
            <TouchButton
              variant="primary"
              size="lg"
              onClick={handleSave}
              className="flex-1"
              disabled={isLoading}
              data-loading={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </TouchButton>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

