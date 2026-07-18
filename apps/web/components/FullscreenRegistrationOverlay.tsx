/**
 * FullscreenRegistrationOverlay Component
 * 
 * Registration form overlay for fullscreen mode.
 * Shown to unregistered users who want to access chat.
 * 
 * Features:
 * - Translucent background (doesn't fully block video)
 * - Mobile-optimized form layout
 * - Collapsible to a button when not needed
 * - Same visual style as chat overlay
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { cn } from '@/lib/utils';

interface FullscreenRegistrationOverlayProps {
  viewer: {
    unlock: (data: { email: string; firstName: string; lastName: string }) => Promise<void>;
    isLoading: boolean;
    error: string | null;
  };
  isVisible: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
}

export function FullscreenRegistrationOverlay({
  viewer,
  isVisible,
  onToggle,
  position = 'right',
}: FullscreenRegistrationOverlayProps) {
  
  // Collapsed: Show button to expand
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          'fixed z-50',
          position === 'right' ? 'right-4' : 'left-4',
          'top-4',
          'bg-primary/90 backdrop-blur-md',
          'text-primary-foreground',
          'px-4 py-2 rounded-lg',
          'font-semibold text-sm',
          'shadow-xl',
          'hover:scale-105 active:scale-95',
          'transition-all duration-200',
          'flex items-center gap-2',
          'border-2 border-primary/50',
          'animate-pulse'
        )}
        data-testid="btn-register-fullscreen"
        aria-label="Register to chat"
      >
        <span className="text-xl">📝</span>
        <span className="hidden sm:inline">Register</span>
        <span className="text-xs opacity-80">to chat</span>
      </button>
    );
  }

  // Expanded: Show registration form
  return (
    <div
      className={cn(
        'fixed inset-y-0 z-50 pointer-events-none',
        position === 'right' ? 'right-0' : 'left-0',
        'w-full sm:w-96 md:w-[28rem]'
      )}
      data-testid="overlay-registration-fullscreen"
    >
      {/* Translucent background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/95 backdrop-blur-sm"
      />

      {/* Content */}
      <div className="relative h-full flex flex-col pointer-events-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <span>📝</span>
            <span>Register to Chat</span>
          </h2>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            data-testid="btn-close-registration"
            aria-label="Close registration"
          >
            ✕
          </Button>
        </div>

        {/* Registration form */}
        <div className="flex-1 overflow-y-auto">
          <ViewerUnlockForm
            onUnlock={viewer.unlock}
            isLoading={viewer.isLoading}
            error={viewer.error}
            title="Join the Conversation"
            description="Your info is only used for chat display (shown as First L.)"
          />
        </div>

        {/* Helper text */}
        <div className="mt-4 text-center text-xs text-white/60">
          <p>After registering, you can chat in fullscreen mode</p>
        </div>
      </div>
    </div>
  );
}

