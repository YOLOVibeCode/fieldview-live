'use client';

/**
 * AdminBroadcast - Translucent overlay banner for admin broadcast messages.
 * Renders at bottom of video; auto-dismisses after N seconds or on click/tap.
 */

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface AdminBroadcastProps {
  message: string;
  onDismiss: () => void;
  autoHideSeconds?: number;
  className?: string;
}

export function AdminBroadcast({
  message,
  onDismiss,
  autoHideSeconds = 10,
  className,
}: AdminBroadcastProps) {
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (autoHideSeconds <= 0) return;
    const t = setTimeout(handleDismiss, autoHideSeconds * 1000);
    return () => clearTimeout(t);
  }, [autoHideSeconds, handleDismiss]);

  return (
    <button
      type="button"
      onClick={handleDismiss}
      className={cn(
        'absolute inset-x-0 bottom-0 z-[25]',
        'px-4 py-3 text-left',
        'bg-black/70 backdrop-blur-sm',
        'border-l-4 border-amber-500',
        'text-white text-sm break-words',
        'animate-in slide-in-from-bottom-2 duration-300',
        'cursor-pointer hover:bg-black/80 transition-colors',
        className
      )}
      data-testid="admin-broadcast-overlay"
      aria-label={`Admin message: ${message}. Click to dismiss.`}
    >
      <span className="font-semibold text-amber-400">Announcement: </span>
      <span className="text-white/95">{message}</span>
    </button>
  );
}
