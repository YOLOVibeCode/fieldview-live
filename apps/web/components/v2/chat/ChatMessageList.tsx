/**
 * ChatMessageList Component
 * 
 * Scrollable message feed with auto-scroll to latest
 * 
 * Usage:
 * ```tsx
 * <ChatMessageList
 *   messages={messages}
 *   currentUserId="user-123"
 *   isLoading={false}
 * />
 * ```
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { Skeleton } from '@/components/v2/primitives';

export interface ChatMessageData {
  id: string;
  userName: string;
  userId: string;
  userColor: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

export interface ChatMessageListProps {
  messages: ChatMessageData[];
  currentUserId?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * ChatMessageList Component
 * 
 * Auto-scrolling message list with loading states
 */
export function ChatMessageList({
  messages,
  currentUserId,
  isLoading = false,
  emptyMessage = 'No messages yet. Be the first to say hello!',
  className,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Only scroll if it's a new message (not initial load)
    if (lastMessage && lastMessage.id !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.id;
      
      // Smooth scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages]);
  
  return (
    <div
      ref={scrollRef}
      data-testid="chat-message-list"
      className={cn(
        'flex-1 overflow-y-auto',
        'bg-[var(--fv-color-bg-primary)]',
        className
      )}
    >
      {/* Loading State */}
      {isLoading && messages.length === 0 && (
        <div className="p-4 space-y-3" data-testid="chat-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="circle" size={40} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="100px" />
                <Skeleton variant="rectangle" width="80%" height="40px" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && messages.length === 0 && (
        <div
          data-testid="chat-empty"
          className="flex items-center justify-center h-full p-8 text-center"
        >
          <p className="text-[var(--fv-color-text-secondary)]">
            {emptyMessage}
          </p>
        </div>
      )}
      
      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-1">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              id={msg.id}
              userName={msg.userName}
              userColor={msg.userColor}
              message={msg.message}
              timestamp={msg.timestamp}
              isOwn={currentUserId === msg.userId}
              isSystem={msg.isSystem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

