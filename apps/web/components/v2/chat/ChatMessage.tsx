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
  variant?: 'default' | 'compact';
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
  variant = 'default',
  className,
  'data-testid': dataTestId,
}: ChatMessageProps) {
  const formattedTime = format(timestamp, 'h:mm a');
  
  // System messages (no avatar)
  if (isSystem) {
    return (
      <div
        role="article"
        data-testid={dataTestId || 'chat-message'}
        aria-label={`System message: ${message}`}
        className={cn(
          'system flex justify-center py-2',
          className
        )}
      >
        <div className="text-xs text-[var(--fv-color-text-muted)] italic">
          {message}
        </div>
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

