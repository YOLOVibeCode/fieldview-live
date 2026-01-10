/**
 * useGameChat Hook
 * 
 * Universal chat hook for any game/stream type.
 * Now uses pluggable transport layer for better testability.
 * 
 * ## Usage (Production)
 * ```tsx
 * const chat = useGameChat({
 *   gameId,
 *   viewerToken: viewer.token,
 *   enabled: viewer.isUnlocked,
 * });
 * 
 * <GameChatPanel chat={chat} />
 * ```
 * 
 * ## Usage (Testing)
 * ```tsx
 * const mockTransport = new MockMessageTransport('Alice');
 * const chat = useGameChat({
 *   gameId,
 *   viewerToken,
 *   transport: mockTransport, // Inject mock for testing
 * });
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { IMessageTransport } from '@/lib/chat/IMessageTransport';
import { SSEMessageTransport } from '@/lib/chat/SSEMessageTransport';

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
  /** Optional transport injection for testing (defaults to SSEMessageTransport) */
  transport?: IMessageTransport;
}

export function useGameChat({ 
  gameId, 
  viewerToken, 
  enabled = true,
  transport: injectedTransport,
}: UseGameChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use injected transport or create default SSE transport
  // useMemo ensures we don't recreate transport on every render
  const transport = useMemo(
    () => injectedTransport || new SSEMessageTransport(),
    [injectedTransport]
  );
  
  // Track if we created the transport (so we know to clean it up)
  const transportCreatedByUs = useRef(!injectedTransport);

  // Connect to chat via transport
  useEffect(() => {
    if (!enabled || !gameId || !viewerToken) {
      return;
    }

    // Subscribe to transport events
    const unsubscribers = [
      transport.onSnapshot((snapshot) => {
        setMessages(snapshot.messages);
        console.log('[Chat] Received snapshot:', snapshot.messages.length, 'messages');
      }),
      
      transport.onMessage((msg) => {
        setMessages((prev) => [msg, ...prev]); // Newest first
        console.log('[Chat] Received message:', msg.id);
      }),
      
      transport.onConnectionChange((connected) => {
        setIsConnected(connected);
        if (connected) {
          setError(null);
        }
      }),
      
      transport.onError((err) => {
        console.error('[Chat] Transport error:', err);
        setError(err.message);
      }),
    ];

    // Connect
    transport.connect(gameId, viewerToken).catch((err) => {
      console.error('[Chat] Failed to connect:', err);
      setError(err.message);
    });

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
      
      // Only disconnect if we created the transport
      // If it was injected, the owner is responsible for lifecycle
      if (transportCreatedByUs.current) {
        transport.disconnect();
      }
    };
  }, [enabled, gameId, viewerToken, transport]);

  const sendMessage = useCallback(async (text: string) => {
    return transport.sendMessage(text);
  }, [transport]);

  return {
    messages,
    isConnected,
    error,
    sendMessage,
  };
}
