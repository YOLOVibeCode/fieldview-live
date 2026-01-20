/**
 * ChatInput Component
 * 
 * Message input with send button
 * Mobile-optimized with Enter key support
 * 
 * Usage:
 * ```tsx
 * <ChatInput
 *   onSend={(message) => sendMessage(message)}
 *   placeholder="Type a message..."
 *   disabled={false}
 *   isLoading={false}
 * />
 * ```
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TouchButton, Icon } from '@/components/v2/primitives';

export interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
}

/**
 * ChatInput Component
 * 
 * Input field for composing and sending messages
 */
export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false,
  maxLength = 500,
  autoFocus = false,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isLoading) {
      onSend(trimmed);
      setMessage('');
      inputRef.current?.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div
      data-testid="chat-input"
      className={cn(
        'flex items-center gap-2 p-3',
        'bg-[var(--fv-color-bg-secondary)]',
        'border-t border-[var(--fv-color-border)]',
        className
      )}
    >
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        maxLength={maxLength}
        aria-label="Message input"
        data-testid="input-chat-message"
        className={cn(
          'flex-1 h-10 px-4 rounded-full',
          'bg-[var(--fv-color-bg-elevated)]',
          'border border-[var(--fv-color-border)]',
          'text-[var(--fv-color-text-primary)]',
          'placeholder:text-[var(--fv-color-text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-[var(--fv-duration-fast)]'
        )}
      />
      
      {/* Send Button */}
      <TouchButton
        onClick={handleSend}
        disabled={!message.trim() || disabled || isLoading}
        isLoading={isLoading}
        variant="primary"
        size="icon"
        aria-label="Send message"
        data-testid="btn-send-message"
        haptic
      >
        {!isLoading && <Icon name="chevron-right" size="md" />}
      </TouchButton>
    </div>
  );
}

