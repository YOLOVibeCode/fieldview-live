/**
 * Chat Service Implementation
 * 
 * Business logic for game chat with validation and pubsub.
 */

import type { IChatReader, IChatWriter } from '../repositories/IChatRepository';
import type { IChatPubSub } from '../lib/chat-pubsub';
import type {
  IChatService,
  ChatSnapshot,
  SendMessageInput,
  SendMessageResult,
} from './IChatService';
import { BadRequestError } from '../lib/errors';

export class ChatService implements IChatService {
  constructor(
    private chatRepo: IChatReader & IChatWriter,
    private pubsub: IChatPubSub
  ) {}

  async getGameSnapshot(gameId: string, limit: number = 50): Promise<ChatSnapshot> {
    const messages = await this.chatRepo.getRecentMessages(gameId, limit);
    const total = await this.chatRepo.countMessages(gameId);

    return {
      gameId,
      messages,
      total,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    // Validate message
    const trimmed = input.message.trim();
    
    if (trimmed.length < 1) {
      throw new BadRequestError('Message cannot be empty');
    }
    
    if (trimmed.length > 240) {
      throw new BadRequestError('Message cannot exceed 240 characters');
    }

    // Create message
    const message = await this.chatRepo.createMessage({
      gameId: input.gameId,
      viewerId: input.viewerId,
      displayName: input.displayName,
      message: trimmed,
    });

    // Broadcast to all subscribers for this game
    await this.pubsub.publish(input.gameId, message);

    return {
      message,
      broadcastNeeded: true,
    };
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.chatRepo.deleteMessage(messageId);
  }
}

