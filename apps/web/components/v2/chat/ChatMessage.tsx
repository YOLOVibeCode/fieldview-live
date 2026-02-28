/**
 * ChatMessage Component
 * 
 * Individual message bubble with avatar, timestamp, and user color
 * 
 * Usage:
 * ```tsx
 * <ChatMessage
 *   id="msg-1"
 *   userName="John Doe"
 *   userColor="#3B82F6"
 *   message="Hello everyone!"
 *   timestamp={new Date()}
 *   isOwn={false}
 * />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface ChatMessageProps {
  id: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: Date;
  isOwn?: boolean;
  isSystem?: boolean;
  isAdminBroadcast?: boolean;
  variant?: 'default' | 'compact' | 'twitch';
  className?: string;
  'data-testid'?: string;
}

/**
 * Get initials from user name (first two words)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * ChatMessage Component
 * 
 * Message bubble with avatar and metadata
 */
export function ChatMessage({
  id,
  userName,
  userColor,
  message,
  timestamp,
  isOwn = false,
  isSystem = false,
  isAdminBroadcast = false,
  variant = 'default',
  className,
  'data-testid': dataTestId,
}: ChatMessageProps) {
  const formattedTime = format(timestamp, 'h:mm a');

  // Admin broadcast: highlighted full-width message
  if (isAdminBroadcast) {
    return (
      <div
        role="article"
        data-testid={dataTestId || 'chat-message-admin-broadcast'}
        aria-label={`Admin broadcast: ${message}`}
        className={cn(
          'flex items-start gap-2 py-1.5 px-3 rounded-md',
          'bg-amber-900/40 border border-amber-500/50',
          'text-sm break-words',
          className
        )}
      >
        <span className="shrink-0 text-amber-400" aria-hidden="true">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13a3 3 0 100-6M12 8c0-1.657-.895-3-2-3s-2 1.343-2 3 1 3 2 3 2-1.343 2-3z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-amber-400">ADMIN</span>
          <span className="text-white/90">: {message}</span>
        </div>
      </div>
    );
  }

  // System messages (no avatar)
  if (isSystem) {
    return (
      <div
        role="article"
        data-testid={dataTestId || 'chat-message'}
        aria-label={`System message: ${message}`}
        className={cn(
          'system flex justify-center',
          variant === 'twitch' ? 'py-0.5' : 'py-2',
          className
        )}
      >
        <div className="text-xs text-[var(--fv-color-text-muted)] italic">
          {message}
        </div>
      </div>
    );
  }

  // Twitch-style: single line, no avatar, minimal padding
  if (variant === 'twitch') {
    return (
      <div
        role="article"
        data-testid={dataTestId || 'chat-message'}
        aria-label={`${userName} at ${formattedTime}: ${message}`}
        title={formattedTime}
        className={cn(
          'py-0.5 px-3 text-sm break-words',
          className
        )}
      >
        <span
          className="font-semibold shrink-0"
          style={{ color: userColor }}
        >
          {userName}
        </span>
        <span className="text-white/90">: {message}</span>
      </div>
    );
  }

  return (
    <div
      role="article"
      data-testid={dataTestId || 'chat-message'}
      aria-label={`${userName} at ${formattedTime}: ${message}`}
      className={cn(
        'flex gap-3 py-2 px-3',
        variant === 'compact' && 'compact py-1',
        isOwn && 'own flex-row-reverse',
        className
      )}
    >
      {/* Avatar */}
      <div
        data-testid="chat-avatar"
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center text-white font-semibold',
          variant === 'compact' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
        )}
        style={{ backgroundColor: userColor }}
        aria-hidden="true"
      >
        {getInitials(userName)}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0',
        isOwn && 'flex flex-col items-end'
      )}>
        {/* Header: Name + Timestamp */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: userColor }}
          >
            {userName}
          </span>
          <span className="text-[10px] text-[var(--fv-color-text-muted)] shrink-0">
            {formattedTime}
          </span>
        </div>

        {/* Message Text */}
        <div
          className={cn(
            'rounded-lg px-3 py-2 break-words',
            isOwn
              ? 'bg-[var(--fv-color-primary-500)] text-white'
              : 'bg-[var(--fv-color-bg-elevated)] text-[var(--fv-color-text-primary)]',
            variant === 'compact' && 'px-2 py-1 text-sm'
          )}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

