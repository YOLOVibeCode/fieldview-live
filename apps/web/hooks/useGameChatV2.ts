/**
 * useGameChatV2 Hook
 * 
 * Adapter hook that bridges useGameChat (v1) with v2 Chat component.
 * Transforms message format and provides v2-compatible interface.
 * 
 * Usage:
 * ```tsx
 * const chat = useGameChatV2({
 *   gameId,
 *   viewerToken: viewer.token,
 *   enabled: viewer.isUnlocked,
 * });
 * 
 * <Chat
 *   messages={chat.messages}
 *   onSend={chat.sendMessage}
 *   currentUserId={chat.currentUserId}
 *   isLoading={chat.isLoading}
 *   disabled={!chat.isConnected}
 * />
 * ```
 */

'use client';

import { useMemo } from 'react';
import { useGameChat, type ChatMessage } from './useGameChat';
import type { ChatMessageData } from '@/components/v2/chat/ChatMessageList';

interface UseGameChatV2Options {
  gameId: string | null;
  viewerToken: string | null;
  enabled?: boolean;
  currentUserId?: string;
}

interface UseGameChatV2Return {
  messages: ChatMessageData[];
  sendMessage: (text: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserId: string;
}

/**
 * Generate a consistent color for a user based on their display name
 */
function generateUserColor(displayName: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Transform v1 ChatMessage to v2 ChatMessageData
 */
function transformMessage(msg: ChatMessage): ChatMessageData {
  return {
    id: msg.id,
    userName: msg.displayName,
    userId: msg.id, // Use message ID as userId (we don't have separate userId)
    userColor: generateUserColor(msg.displayName),
    message: msg.message,
    timestamp: new Date(msg.createdAt),
    isSystem: false,
  };
}

/**
 * Hook that adapts useGameChat to v2 Chat component interface
 */
export function useGameChatV2({
  gameId,
  viewerToken,
  enabled = true,
  currentUserId,
}: UseGameChatV2Options): UseGameChatV2Return {
  // Use existing v1 hook
  const v1Chat = useGameChat({
    gameId,
    viewerToken,
    enabled,
  });

  // Transform messages to v2 format
  const messages = useMemo(
    () => v1Chat.messages.map(transformMessage),
    [v1Chat.messages]
  );

  // Wrap sendMessage to handle the Promise<unknown> → Promise<void> conversion
  const sendMessage = async (text: string): Promise<void> => {
    await v1Chat.sendMessage(text);
  };

  return {
    messages,
    sendMessage,
    isConnected: v1Chat.isConnected,
    isLoading: false, // v1 doesn't have isLoading
    error: v1Chat.error,
    currentUserId: currentUserId || 'viewer', // Default userId
  };
}

