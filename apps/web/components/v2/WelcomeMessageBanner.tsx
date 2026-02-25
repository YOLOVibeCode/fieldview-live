'use client';

/**
 * WelcomeMessageBanner - Dismissible announcement banner for first load.
 * Admin-configurable message (e.g. apology, system status). Dismissal stored in localStorage
 * per slug; if admin changes the message, it shows again.
 */

import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'welcome-dismissed-';

export interface WelcomeMessageBannerProps {
  message: string;
  slug: string;
  onDismiss: () => void;
  className?: string;
}

export function WelcomeMessageBanner({
  message,
  slug,
  onDismiss,
  className,
}: WelcomeMessageBannerProps) {
  const handleDismiss = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`${STORAGE_PREFIX}${slug}`, message);
      }
    } finally {
      onDismiss();
    }
  };

  return (
    <div
      role="region"
      aria-label="Welcome message"
      data-testid="welcome-message-banner"
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        'bg-black/85 backdrop-blur-sm border-b border-amber-500/40',
        'text-white text-sm',
        className
      )}
    >
      <div className="flex-1 min-w-0 py-0.5">
        <p className="break-words">{message}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-2 rounded hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Dismiss welcome message"
        data-testid="btn-dismiss-welcome"
      >
        <span className="text-lg font-bold leading-none" aria-hidden="true">
          ×
        </span>
      </button>
    </div>
  );
}

/**
 * Check if the welcome message has been dismissed for this slug and message.
 * If the admin changes the message, this returns false so the banner shows again.
 */
export function isWelcomeDismissed(slug: string, currentMessage: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
  return stored === currentMessage;
}
