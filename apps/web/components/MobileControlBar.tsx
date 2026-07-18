/**
 * MobileControlBar Component
 * 
 * Touch-friendly control bar for mobile devices.
 * Replaces keyboard shortcuts with tap-friendly buttons.
 * 
 * Features:
 * - Large touch targets (56px height, 48px minimum tap area)
 * - Clear icons with badges
 * - Auto-hide in fullscreen
 * - Thumb-zone optimized (bottom positioning)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileControlBarProps {
  // Scoreboard
  scoreboardEnabled: boolean;
  homeScore?: number;
  awayScore?: number;
  onScoreboardToggle: () => void;
  
  // Chat
  chatEnabled: boolean;
  chatBadgeCount?: number;
  onChatToggle: () => void;
  
  // Fullscreen
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  
  // Behavior
  autoHide?: boolean;
  autoHideDelay?: number; // milliseconds
  className?: string;
}

export function MobileControlBar({
  scoreboardEnabled,
  homeScore = 0,
  awayScore = 0,
  onScoreboardToggle,
  chatEnabled,
  chatBadgeCount = 0,
  onChatToggle,
  isFullscreen,
  onFullscreenToggle,
  autoHide = false,
  autoHideDelay = 4000,
  className,
}: MobileControlBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide logic
  const resetHideTimer = useCallback(() => {
    if (!autoHide) return;

    // Clear existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Show controls
    setIsVisible(true);

    // Set new timeout to hide
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);

    setHideTimeout(timeout);
  }, [autoHide, autoHideDelay, hideTimeout]);

  // Show controls on user interaction
  useEffect(() => {
    if (!autoHide) {
      setIsVisible(true);
      return;
    }

    const handleInteraction = () => {
      resetHideTimer();
    };

    // Listen for touches/clicks to reveal controls
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('mousedown', handleInteraction);
    document.addEventListener('mousemove', handleInteraction);

    // Initial timer
    resetHideTimer();

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('mousedown', handleInteraction);
      document.removeEventListener('mousemove', handleInteraction);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [autoHide, resetHideTimer, hideTimeout]);

  const scoreBadge = `${homeScore}-${awayScore}`;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
        'pb-safe', // iOS safe area
        'transition-all duration-300',
        !isVisible && 'translate-y-full opacity-0',
        className
      )}
      data-testid="mobile-control-bar"
    >
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {/* Scoreboard Button */}
        {scoreboardEnabled && (
          <Button
            onClick={onScoreboardToggle}
            variant="secondary"
            size="lg"
            className={cn(
              'flex items-center gap-2 min-h-[48px] px-4',
              'bg-background/95 backdrop-blur-sm',
              'border-2 border-accent/30',
              'hover:bg-background hover:border-accent/60',
              'active:scale-95 transition-all'
            )}
            data-testid="mobile-btn-scoreboard"
            aria-label="Toggle scoreboard"
          >
            <span className="text-xl">📊</span>
            <span className="font-bold text-sm">{scoreBadge}</span>
          </Button>
        )}

        {/* Chat Button */}
        {chatEnabled && (
          <Button
            onClick={onChatToggle}
            variant="secondary"
            size="lg"
            className={cn(
              'flex items-center gap-2 min-h-[48px] px-4',
              'bg-background/95 backdrop-blur-sm',
              'border-2 border-primary/30',
              'hover:bg-background hover:border-primary/60',
              'active:scale-95 transition-all',
              'relative'
            )}
            data-testid="mobile-btn-chat"
            aria-label="Toggle chat"
          >
            <span className="text-xl">💬</span>
            <span className="font-medium text-sm hidden sm:inline">Chat</span>
            {chatBadgeCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                data-testid="mobile-chat-badge"
              >
                {chatBadgeCount > 9 ? '9+' : chatBadgeCount}
              </span>
            )}
          </Button>
        )}

        {/* Fullscreen Button */}
        <Button
          onClick={onFullscreenToggle}
          variant="secondary"
          size="lg"
          className={cn(
            'flex items-center gap-2 min-h-[48px] px-4',
            'bg-background/95 backdrop-blur-sm',
            'border-2 border-muted/30',
            'hover:bg-background hover:border-muted/60',
            'active:scale-95 transition-all'
          )}
          data-testid="mobile-btn-fullscreen"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <span className="text-xl">{isFullscreen ? '⛶' : '📺'}</span>
          <span className="font-medium text-sm hidden sm:inline">
            {isFullscreen ? 'Exit' : 'Full'}
          </span>
        </Button>
      </div>

      {/* Visual indicator that controls will auto-hide */}
      {autoHide && isVisible && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2">
          <div className="text-xs text-white/60 bg-black/40 rounded-full px-3 py-1 backdrop-blur-sm">
            Tap to show controls
          </div>
        </div>
      )}
    </div>
  );
}

