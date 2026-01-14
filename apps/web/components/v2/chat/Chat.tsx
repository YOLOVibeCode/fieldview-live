/**
 * Chat Component
 * 
 * Main chat component orchestrating message list and input
 * Supports multiple display modes
 * 
 * Usage:
 * ```tsx
 * <Chat
 *   mode="floating"
 *   title="Live Chat"
 *   messages={messages}
 *   currentUserId="user-123"
 *   onSend={(message) => sendMessage(message)}
 *   isLoading={false}
 *   disabled={false}
 * />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';
import { ChatMessageList, type ChatMessageData } from './ChatMessageList';
import { ChatInput } from './ChatInput';

export interface ChatProps {
  messages: ChatMessageData[];
  onSend: (message: string) => void;
  currentUserId?: string;
  mode?: 'floating' | 'sidebar' | 'embedded';
  title?: string;
  isLoading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Chat Component
 * 
 * Complete chat interface with message list and input
 */
export function Chat({
  messages,
  onSend,
  currentUserId,
  mode = 'embedded',
  title = 'Chat',
  isLoading = false,
  disabled = false,
  emptyMessage,
  className,
  'data-testid': dataTestId,
}: ChatProps) {
  return (
    <div
      role="region"
      aria-label="Chat"
      data-testid={dataTestId || 'chat'}
      className={cn(
        // Base styles
        'flex flex-col',
        'bg-[var(--fv-color-bg-primary)]',
        
        // Mode-specific styles
        mode === 'floating' && 'floating rounded-xl shadow-lg border border-[var(--fv-color-border)]',
        mode === 'sidebar' && 'sidebar h-full',
        mode === 'embedded' && 'embedded h-full',
        
        className
      )}
    >
      {/* Header (optional) */}
      {title && (
        <div
          className={cn(
            'shrink-0 px-4 py-3',
            'border-b border-[var(--fv-color-border)]',
            'bg-[var(--fv-color-bg-secondary)]'
          )}
        >
          <h3 className="text-lg font-semibold text-[var(--fv-color-text-primary)]">
            {title}
          </h3>
        </div>
      )}
      
      {/* Message List */}
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />
      
      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={onSend}
          disabled={disabled}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

