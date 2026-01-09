/**
 * FullscreenChatOverlay Component
 * 
 * Beautiful translucent chat overlay for fullscreen video viewing.
 * Features:
 * - Gradient opacity (fully transparent at video center, opaque at edges)
 * - Toggle visibility with keyboard shortcut (C)
 * - Auto-scroll to newest messages
 * - Mobile-optimized touch targets
 * - Smooth animations
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/hooks/useGameChat';

interface FullscreenChatOverlayProps {
  chat: {
    messages: ChatMessage[];
    isConnected: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<unknown>;
  };
  isVisible: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
}

const MAX_MESSAGE_LENGTH = 240;

interface Position {
  x: number;
  y: number;
}

export function FullscreenChatOverlay({
  chat,
  isVisible,
  onToggle,
  position = 'right',
}: FullscreenChatOverlayProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: C to toggle chat
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
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

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedPosition = localStorage.getItem('chat-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition) as Position;
        setDragPosition(parsed);
      } catch (e) {
        // Invalid saved position, ignore
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((pos: Position) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('chat-position', JSON.stringify(pos));
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (overlayRef.current?.offsetWidth || 400);
    const maxY = window.innerHeight - (overlayRef.current?.offsetHeight || 500);
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    setDragPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragPosition) {
      savePosition(dragPosition);
    }
    setIsDragging(false);
  }, [isDragging, dragPosition, savePosition]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!overlayRef.current) return;
    
    const touch = e.touches[0];
    const rect = overlayRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (overlayRef.current?.offsetWidth || 400);
    const maxY = window.innerHeight - (overlayRef.current?.offsetHeight || 500);
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    setDragPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragOffset]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && dragPosition) {
      savePosition(dragPosition);
    }
    setIsDragging(false);
  }, [isDragging, dragPosition, savePosition]);

  // Attach global mouse/touch listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
    // Minimized toggle button
    return (
      <button
        onClick={onToggle}
        className={`
          fixed ${position === 'right' ? 'right-4' : 'left-4'} top-4
          z-50
          bg-gradient-to-br from-blue-600/90 to-purple-600/90
          backdrop-blur-md
          text-white
          px-4 py-2 rounded-full
          font-medium text-sm
          shadow-lg
          hover:scale-105 active:scale-95
          transition-all duration-200
          flex items-center gap-2
        `}
        data-testid="btn-toggle-chat"
        aria-label="Toggle chat overlay"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline">Chat</span>
        {chat.messages.length > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {chat.messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed z-50 pointer-events-none',
        dragPosition ? '' : (position === 'right' ? 'inset-y-0 right-0' : 'inset-y-0 left-0'),
        dragPosition ? '' : 'w-full sm:w-96 md:w-[28rem]'
      )}
      style={dragPosition ? {
        left: `${dragPosition.x}px`,
        top: `${dragPosition.y}px`,
        width: window.innerWidth < 640 ? '90%' : '448px',
        maxHeight: '90vh',
      } : undefined}
      data-testid="overlay-chat"
    >
      {/* Gradient background - transparent top (near video), opaque bottom (chat input) */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-b from-transparent via-black/30 to-black/80',
          'backdrop-blur-sm',
          'rounded-lg',
          isDragging && 'ring-2 ring-primary'
        )}
      />

      {/* Chat content */}
      <div className="relative h-full flex flex-col pointer-events-auto">
        {/* Header - Minimal, semi-transparent, DRAGGABLE */}
        <div 
          className={cn(
            "flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm rounded-t-lg",
            "cursor-move select-none"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          data-testid="chat-drag-handle"
        >
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">⋮⋮</span>
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
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
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
            className="mx-4 mt-2 p-3 bg-destructive/20 backdrop-blur-md border border-destructive/30 text-destructive rounded-lg text-sm"
            data-testid="chat-error"
            role="alert"
          >
            {chat.error}
          </div>
        )}

        {/* Messages list - scrollable middle section (newest at bottom) */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex flex-col justify-end"
          data-testid="list-chat-messages"
        >
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-white/60 text-sm text-center">
                No messages yet.<br />Be the first to chat!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chat.messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-3 shadow-lg animate-in slide-in-from-bottom-2 duration-300"
                  data-testid={`chat-msg-${msg.id}`}
                  style={{ opacity: Math.max(0.5, 1 - (chat.messages.length - idx - 1) * 0.05) }}
                >
                  <div className="text-blue-300 font-semibold text-sm mb-1">
                    {msg.displayName}
                  </div>
                  <div className="text-white text-base leading-relaxed break-words">
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer - fixed at bottom with strong background */}
        <div className="p-4 bg-black/90 backdrop-blur-lg border-t border-white/10">
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
                  bg-white/10 backdrop-blur-md
                  border-white/20
                  text-white placeholder:text-white/50
                  focus:bg-white/20 focus:border-blue-400/50
                  transition-all
                "
                aria-label="Chat message input"
              />
              <Button
                type="submit"
                disabled={!canSend || !chat.isConnected}
                data-testid="btn-send-message"
                className="
                  min-h-[48px] min-w-[80px] px-6
                  bg-gradient-to-r from-blue-600 to-purple-600
                  hover:from-blue-700 hover:to-purple-700
                  text-white font-semibold
                  active:scale-95 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg
                "
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80 font-mono">C</kbd> to toggle
              </span>
              <span className="text-white/60">
                {remainingChars} remaining
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

