/**
 * TchsFullscreenChatOverlay Component
 * 
 * TCHS-branded fullscreen chat overlay matching the dark theme:
 * - Black/gray-900 background
 * - Blue accent colors
 * - Top-to-bottom gradient (transparent → opaque)
 * - Newest messages at bottom
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useGameChat';

interface TchsFullscreenChatOverlayProps {
  chat: {
    messages: ChatMessage[];
    isConnected: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<unknown>;
  };
  isVisible: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
}

const MAX_MESSAGE_LENGTH = 240;

const FONT_SIZES = {
  small: { name: 'text-sm', message: 'text-sm' },
  medium: { name: 'text-sm', message: 'text-base' },
  large: { name: 'text-base', message: 'text-lg' },
};

export function TchsFullscreenChatOverlay({
  chat,
  isVisible,
  onToggle,
  position = 'right',
  fontSize = 'medium',
}: TchsFullscreenChatOverlayProps) {
  const fontClasses = FONT_SIZES[fontSize];
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: C to toggle chat
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onToggle]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (isVisible) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages, isVisible]);

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

  if (!isVisible) {
    // Minimized toggle button - TCHS styled
    return (
      <button
        onClick={onToggle}
        className={`
          fixed ${position === 'right' ? 'right-4' : 'left-4'} top-4
          z-50
          bg-blue-600 hover:bg-blue-700
          text-white
          px-4 py-2 rounded-lg
          font-semibold text-sm
          shadow-xl
          hover:scale-105 active:scale-95
          transition-all duration-200
          flex items-center gap-2
          border border-blue-500
        `}
        data-testid="btn-toggle-chat"
        aria-label="Toggle chat overlay"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline">Chat</span>
        {chat.messages.length > 0 && (
          <span className="bg-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
            {chat.messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`
        fixed inset-y-0 ${position === 'right' ? 'right-0' : 'left-0'}
        z-50
        w-full sm:w-96 md:w-[28rem]
        pointer-events-none
      `}
      data-testid="overlay-chat"
    >
      {/* Gradient background - TCHS theme: transparent top → gray-900 bottom */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/40 to-gray-900/95 backdrop-blur-sm"
      />

      {/* Chat content */}
      <div className="relative h-full flex flex-col pointer-events-auto">
        {/* Header - Minimal */}
        <div className="flex items-center justify-between p-4 bg-gray-900/30 backdrop-blur-sm border-b border-gray-700/30">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-lg">Chat</h2>
            {chat.isConnected ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">Connecting...</span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            data-testid="btn-close-chat"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {chat.error && (
          <div 
            className="mx-4 mt-2 p-3 bg-destructive/30 backdrop-blur-md border border-destructive/40 text-destructive rounded-lg text-sm"
            data-testid="chat-error"
            role="alert"
          >
            {chat.error}
          </div>
        )}

        {/* Messages list - scrollable, newest at bottom */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex flex-col justify-end"
          data-testid="list-chat-messages"
        >
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-gray-500 text-sm text-center">
                No messages yet.<br />Be the first to chat!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chat.messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className="bg-gray-800/60 backdrop-blur-md rounded-lg p-3 border border-gray-700/40 shadow-lg animate-in slide-in-from-bottom-2 duration-300"
                  data-testid={`chat-msg-${msg.id}`}
                  style={{ opacity: Math.max(0.6, 1 - (chat.messages.length - idx - 1) * 0.04) }}
                >
                  <div className={`text-blue-400 font-semibold mb-1 ${fontClasses.name}`}>
                    {msg.displayName}
                  </div>
                  <div className={`text-white leading-relaxed break-words ${fontClasses.message}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer - TCHS styled */}
        <div className="p-4 bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isSending || !chat.isConnected}
                maxLength={MAX_MESSAGE_LENGTH}
                data-testid="input-chat-message"
                className="
                  flex-1 min-h-[48px] text-base
                  bg-gray-800 border-gray-700
                  text-white placeholder:text-gray-500
                  focus:bg-gray-800 focus:border-blue-500
                  transition-all
                "
                aria-label="Chat message input"
              />
              <button
                type="submit"
                disabled={!canSend || !chat.isConnected}
                data-testid="btn-send-message"
                className="
                  min-h-[48px] px-6
                  bg-blue-600 hover:bg-blue-700
                  text-white font-semibold
                  rounded-md
                  active:scale-95 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg
                "
                aria-label="Send message"
              >
                Send
              </button>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400 font-mono">C</kbd> to toggle
              </span>
              <span className="text-gray-500">
                {remainingChars} remaining
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

