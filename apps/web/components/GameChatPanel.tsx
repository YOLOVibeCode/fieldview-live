/**
 * GameChatPanel Component
 * 
 * Reusable chat UI for any game/stream type.
 * Displays messages (newest first), composer, and connection status.
 * 
 * Usage:
 * ```tsx
 * const chat = useGameChat({ gameId, viewerToken });
 * <GameChatPanel chat={chat} />
 * ```
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useGameChat';

interface GameChatPanelProps {
  chat: {
    messages: ChatMessage[];
    isConnected: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<unknown>;
  };
  className?: string;
  fontSize?: 'small' | 'medium' | 'large';
  canSend?: boolean; // If false, messages are read-only
  registrationPrompt?: React.ReactNode; // Shown when canSend is false
}

const MAX_MESSAGE_LENGTH = 240;

// Font size mappings (rem-based for accessibility)
const FONT_SIZES = {
  small: {
    name: 'text-sm',       // 0.875rem (14px)
    message: 'text-sm',    // 0.875rem (14px)
  },
  medium: {
    name: 'text-sm',       // 0.875rem (14px)
    message: 'text-base',  // 1rem (16px)
  },
  large: {
    name: 'text-base',     // 1rem (16px)
    message: 'text-lg',    // 1.125rem (18px)
  },
};

export function GameChatPanel({ chat, className = '', fontSize = 'medium', canSend: canSendMessages = true, registrationPrompt }: GameChatPanelProps) {
  const fontClasses = FONT_SIZES[fontSize];
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await chat.sendMessage(trimmed);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setMessageText(value);
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - messageText.length;
  const canSend = messageText.trim().length > 0 && !isSending;

  return (
    <Card className={className} data-testid="panel-chat">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Chat</CardTitle>
            <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full font-medium">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            {chat.isConnected ? (
              <span className="text-success font-medium">● Live</span>
            ) : (
              <span className="text-muted-foreground">○ Connecting...</span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This is a beta feature and may not be functioning yet.
        </p>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        {/* Error message */}
        {chat.error && (
          <div 
            className="p-3 bg-destructive/10 text-destructive rounded-md text-sm leading-relaxed"
            data-testid="chat-error"
            role="alert"
          >
            {chat.error}
          </div>
        )}

        {/* Messages list (newest first) - Mobile optimized */}
        <div 
          className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2 -mr-2"
          data-testid="list-chat-messages"
        >
          {chat.messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">
              No messages yet. Be the first to chat!
            </p>
          ) : (
            chat.messages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 bg-muted rounded-lg shadow-sm"
                data-testid={`chat-msg-${msg.id}`}
              >
                <div className={`font-semibold text-muted-foreground mb-1 ${fontClasses.name}`}>
                  {msg.displayName}
                </div>
                <div className={`leading-relaxed break-words ${fontClasses.message}`}>
                  {msg.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message composer - Mobile optimized with 44px touch targets */}
        {canSendMessages ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isSending || !chat.isConnected}
                maxLength={MAX_MESSAGE_LENGTH}
                data-testid="input-chat-message"
                className="min-h-[44px] text-base flex-1"
                aria-label="Chat message input"
              />
              <Button
                type="submit"
                disabled={!canSend || !chat.isConnected}
                data-testid="btn-send-message"
                className="min-h-[44px] min-w-[80px] sm:min-w-[100px] text-base font-medium active:scale-95 transition-transform"
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {remainingChars} character{remainingChars !== 1 ? 's' : ''} remaining
            </div>
          </form>
        ) : (
          registrationPrompt || (
            <div className="p-4 bg-muted/50 rounded-lg border border-outline text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Register your email to join the conversation
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
