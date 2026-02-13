'use client';

/**
 * BookmarkToast - Lightweight notification for real-time bookmark announcements.
 *
 * Renders a stack of auto-dismissing notification cards inside the video
 * player container. Each toast shows the bookmark label, time, and a
 * "Jump to" action. Max 3 visible at once.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface BookmarkToastItem {
  id: string;
  label: string;
  time: string;
  timestampSeconds: number;
}

interface BookmarkToastProps {
  toasts: BookmarkToastItem[];
  onJumpTo?: (timestampSeconds: number) => void;
  onDismiss?: (id: string) => void;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

export function BookmarkToast({ toasts, onJumpTo, onDismiss }: BookmarkToastProps) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Auto-dismiss each toast after AUTO_DISMISS_MS
  useEffect(() => {
    for (const toast of toasts) {
      if (!timersRef.current.has(toast.id)) {
        const timer = setTimeout(() => {
          onDismiss?.(toast.id);
          timersRef.current.delete(toast.id);
        }, AUTO_DISMISS_MS);
        timersRef.current.set(toast.id, timer);
      }
    }

    // Cleanup timers for removed toasts
    for (const [id, timer] of timersRef.current.entries()) {
      if (!toasts.some(t => t.id === id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }
  }, [toasts, onDismiss]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const visible = toasts.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      className="absolute bottom-20 right-2 z-[50] flex flex-col gap-2 pointer-events-auto"
      data-testid="bookmark-toasts"
    >
      {visible.map((toast, index) => (
        <div
          key={toast.id}
          className="bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg
            px-3 py-2 shadow-xl border border-white/10
            min-w-[180px] max-w-[260px]
            animate-slide-in"
          style={{ animationDelay: `${index * 50}ms` }}
          data-testid={`toast-bookmark-${toast.id}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-amber-400 font-medium mb-0.5">
                New Bookmark
              </div>
              <div className="font-medium truncate">{toast.label}</div>
              <div className="text-gray-400 font-mono mt-0.5">{toast.time}</div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.(toast.id);
              }}
              className="text-gray-500 hover:text-white shrink-0 p-0.5"
              aria-label="Dismiss notification"
              data-testid={`btn-dismiss-toast-${toast.id}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Jump To action */}
          {onJumpTo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpTo(toast.timestampSeconds);
                onDismiss?.(toast.id);
              }}
              className="mt-1.5 w-full text-[10px] font-medium rounded
                bg-amber-500/15 text-amber-300 hover:bg-amber-500/25
                transition-colors py-1 px-2
                min-h-[28px]"
              data-testid={`btn-toast-jump-${toast.id}`}
              aria-label={`Jump to ${toast.time}`}
            >
              Jump to {toast.time}
            </button>
          )}
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        :global(.animate-slide-in) {
          animation: slideIn 0.3s ease-out both;
        }
      `}</style>
    </div>
  );
}

/**
 * useBookmarkToasts - Manages toast state for bookmark notifications.
 * Use in DirectStreamPageBase to wire up SSE notifications.
 */
export function useBookmarkToasts() {
  const [toasts, setToasts] = useState<BookmarkToastItem[]>([]);

  const addToast = useCallback((item: BookmarkToastItem) => {
    setToasts(prev => {
      // Avoid duplicate toast for same bookmark
      if (prev.some(t => t.id === item.id)) return prev;
      // Keep max toasts reasonable (trim oldest beyond 5)
      const next = [...prev, item];
      return next.length > 5 ? next.slice(-5) : next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
