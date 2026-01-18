/**
 * TeamNameEditor Component
 * 
 * Inline team name editor with save/cancel actions
 * Mobile-optimized with accessibility support
 * 
 * Usage:
 * ```tsx
 * <TeamNameEditor
 *   teamName="Home Team"
 *   color="#3B82F6"
 *   onSave={(newName) => updateTeamName(newName)}
 *   onCancel={() => setEditing(false)}
 * />
 * ```
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TeamNameEditorProps {
  teamName: string;
  color: string;
  maxLength?: number;
  onSave: (newName: string) => void;
  onCancel: () => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * TeamNameEditor Component
 * 
 * Provides inline editing for team names with validation
 */
export function TeamNameEditor({
  teamName,
  color,
  maxLength = 30,
  onSave,
  onCancel,
  className,
  'data-testid': dataTestId,
}: TeamNameEditorProps) {
  const [value, setValue] = useState(teamName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const trimmed = value.trim();
    
    // Validation
    if (trimmed.length === 0) {
      setError('Team name cannot be empty');
      return;
    }
    
    if (trimmed.length > maxLength) {
      setError(`Max ${maxLength} characters`);
      return;
    }
    
    onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        'p-3 rounded-lg',
        'bg-[var(--fv-color-bg-secondary)]',
        'border-2',
        className
      )}
      style={{ borderColor: color }}
      data-testid={dataTestId || 'team-name-editor'}
    >
      {/* Input Field */}
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          className={cn(
            'px-3 py-2 rounded-md',
            'bg-[var(--fv-color-bg-tertiary)]',
            'border border-[var(--fv-color-border)]',
            'text-[var(--fv-color-text-primary)]',
            'placeholder:text-[var(--fv-color-text-muted)]',
            'focus:outline-none focus:ring-2',
            'transition-all',
            error && 'border-red-500 focus:ring-red-500/50',
            !error && 'focus:ring-[var(--fv-color-primary-500)]'
          )}
          style={!error ? { borderColor: color } : undefined}
          placeholder="Enter team name"
          aria-label="Team name input"
          data-testid="team-name-input"
        />
        
        {/* Character Count */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-[var(--fv-color-text-muted)]">
            {value.length}/{maxLength}
          </span>
          
          {/* Error Message */}
          {error && (
            <span className="text-red-500" role="alert" data-testid="team-name-error">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={cn(
            'flex-1 px-4 py-2 rounded-md',
            'font-semibold text-sm',
            'text-white',
            'transition-all',
            'hover:opacity-90 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-offset-2'
          )}
          style={{
            backgroundColor: color,
          }}
          aria-label="Save team name"
          data-testid="btn-save-team-name"
        >
          Save
        </button>
        
        <button
          onClick={onCancel}
          className={cn(
            'flex-1 px-4 py-2 rounded-md',
            'font-semibold text-sm',
            'bg-[var(--fv-color-bg-tertiary)]',
            'text-[var(--fv-color-text-secondary)]',
            'border border-[var(--fv-color-border)]',
            'transition-all',
            'hover:bg-[var(--fv-color-bg-secondary)]',
            'active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-border)]'
          )}
          aria-label="Cancel editing"
          data-testid="btn-cancel-team-name"
        >
          Cancel
        </button>
      </div>

      {/* Hint Text */}
      <p className="text-xs text-[var(--fv-color-text-muted)] text-center">
        Press <kbd className="px-1 py-0.5 bg-[var(--fv-color-bg-tertiary)] rounded text-[10px]">Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-[var(--fv-color-bg-tertiary)] rounded text-[10px]">Esc</kbd> to cancel
      </p>
    </div>
  );
}
