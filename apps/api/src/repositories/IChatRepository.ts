/**
 * Chat Repository Interfaces (ISP)
 *
 * Segregated interfaces for chat message operations.
 */

import type { GameChatMessage } from '@prisma/client';

export interface ChatMessageData {
  gameId: string;
  viewerId: string;
  displayName: string;
  message: string;
  directStreamId?: string; // 🆕 For chat preservation
  kind?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Read Interface (ISP)
 */
export interface IChatReader {
  /**
   * Get most recent messages for a game (newest first)
   */
  getRecentMessages(gameId: string, limit?: number): Promise<GameChatMessage[]>;

  /**
   * Get messages for a viewer
   */
  getMessagesByViewer(viewerId: string, limit?: number): Promise<GameChatMessage[]>;

  /**
   * Get message by ID
   */
  getMessageById(id: string): Promise<GameChatMessage | null>;

  /**
   * Count messages in a game
   */
  countMessages(gameId: string): Promise<number>;
}

/**
 * Write Interface (ISP)
 */
export interface IChatWriter {
  /**
   * Create a new chat message
   */
  createMessage(data: ChatMessageData): Promise<GameChatMessage>;

  /**
   * Delete a message (moderation)
   */
  deleteMessage(id: string): Promise<void>;

  /**
   * Delete all messages for a game (cascades with Game deletion already)
   */
  deleteGameMessages(gameId: string): Promise<number>;

  /**
   * Patch metadata on a game-event chat card after confirm/reject.
   */
  updateMessageMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
}

