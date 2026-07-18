/**
 * Chat Service Interfaces (ISP)
 *
 * Business logic layer for chat operations.
 */

import type { GameChatMessage } from '@prisma/client';

export interface ChatSnapshot {
  gameId: string;
  messages: GameChatMessage[];
  total: number;
}

export interface SendMessageInput {
  gameId: string;
  viewerId: string;
  displayName: string;
  message: string;
}

export interface SendMessageResult {
  message: GameChatMessage;
  broadcastNeeded: boolean;
}

/**
 * Chat Service Interface
 */
export interface IChatService {
  /**
   * Get recent messages snapshot for a game
   */
  getGameSnapshot(gameId: string, limit?: number): Promise<ChatSnapshot>;

  /**
   * Send a new message (with validation and rate limiting)
   */
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;

  /**
   * Delete a message (moderation)
   */
  deleteMessage(messageId: string): Promise<void>;
}

