/**
 * Cinema Mode Toggle Component
 * 
 * Premium feature: Ultra-immersive viewing experience
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CinemaModeToggleProps {
  className?: string;
}

export function CinemaModeToggle({ className = '' }: CinemaModeToggleProps) {
  const [cinemaMode, setCinemaMode] = useState(false);

  useEffect(() => {
    if (cinemaMode) {
      document.documentElement.classList.add('cinema-mode');
    } else {
      document.documentElement.classList.remove('cinema-mode');
    }
  }, [cinemaMode]);

  // Keyboard shortcut: Shift + C
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        setCinemaMode((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCinemaMode(!cinemaMode)}
      className={className}
      data-testid="btn-cinema-mode"
      title={cinemaMode ? 'Exit Cinema Mode (Shift+C)' : 'Enter Cinema Mode (Shift+C)'}
    >
      {cinemaMode ? '🎬 Cinema Mode ON' : '🎬 Cinema Mode'}
    </Button>
  );
}

