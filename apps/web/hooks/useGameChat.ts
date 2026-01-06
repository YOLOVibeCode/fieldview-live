/**
 * useGameChat Hook
 * 
 * Universal chat hook for any game/stream type.
 * Manages SSE connection, message sending, and state.
 * 
 * Usage:
 * ```tsx
 * const chat = useGameChat({
 *   gameId,
 *   viewerToken: viewer.token,
 *   enabled: viewer.isUnlocked,
 * });
 * 
 * <GameChatPanel chat={chat} />
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export interface ChatMessage {
  id: string;
  displayName: string;
  message: string;
  createdAt: string;
}

interface UseGameChatOptions {
  gameId: string | null;
  viewerToken: string | null;
  enabled?: boolean;
}

export function useGameChat({ gameId, viewerToken, enabled = true }: UseGameChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    if (!enabled || !gameId || !viewerToken) {
      return;
    }

    const url = `${API_URL}/api/public/games/${gameId}/chat/stream?token=${encodeURIComponent(viewerToken)}`;
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[Chat] Connected to SSE stream');
      setIsConnected(true);
      setError(null);
    };

    eventSource.addEventListener('chat_snapshot', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(data.messages || []);
        console.log('[Chat] Received snapshot:', data.messages?.length || 0, 'messages');
      } catch (err) {
        console.error('[Chat] Failed to parse snapshot:', err);
      }
    });

    eventSource.addEventListener('chat_message', (e) => {
      try {
        const newMessage: ChatMessage = JSON.parse(e.data);
        setMessages((prev) => [newMessage, ...prev]); // Newest first
        console.log('[Chat] Received message:', newMessage);
      } catch (err) {
        console.error('[Chat] Failed to parse message:', err);
      }
    });

    eventSource.addEventListener('ping', () => {
      // Keep-alive ping, no action needed
    });

    eventSource.onerror = () => {
      console.error('[Chat] SSE connection error');
      setIsConnected(false);
      setError('Connection lost. Reconnecting...');
      // EventSource will auto-reconnect
    };

    return () => {
      console.log('[Chat] Disconnecting SSE stream');
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, gameId, viewerToken]);

  const sendMessage = useCallback(async (text: string) => {
    if (!gameId || !viewerToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/public/games/${gameId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(errorData.error || `Failed to send message: ${response.status}`);
    }

    return await response.json();
  }, [gameId, viewerToken]);

  return {
    messages,
    isConnected,
    error,
    sendMessage,
  };
}
