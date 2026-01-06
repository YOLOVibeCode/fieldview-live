/**
 * Chat Repository Implementation
 *
 * Prisma-based repository for GameChatMessage operations.
 */

import type { PrismaClient, GameChatMessage } from '@prisma/client';
import type {
  IChatReader,
  IChatWriter,
  ChatMessageData,
} from '../IChatRepository';

export class ChatRepository implements IChatReader, IChatWriter {
  constructor(private prisma: PrismaClient) {}

  async getRecentMessages(gameId: string, limit: number = 50): Promise<GameChatMessage[]> {
    return this.prisma.gameChatMessage.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getMessagesByViewer(viewerId: string, limit: number = 50): Promise<GameChatMessage[]> {
    return this.prisma.gameChatMessage.findMany({
      where: { viewerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getMessageById(id: string): Promise<GameChatMessage | null> {
    return this.prisma.gameChatMessage.findUnique({
      where: { id },
    });
  }

  async countMessages(gameId: string): Promise<number> {
    return this.prisma.gameChatMessage.count({
      where: { gameId },
    });
  }

  async createMessage(data: ChatMessageData): Promise<GameChatMessage> {
    return this.prisma.gameChatMessage.create({
      data: {
        gameId: data.gameId,
        viewerId: data.viewerId,
        displayName: data.displayName,
        message: data.message,
      },
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await this.prisma.gameChatMessage.delete({
      where: { id },
    });
  }

  async deleteGameMessages(gameId: string): Promise<number> {
    const result = await this.prisma.gameChatMessage.deleteMany({
      where: { gameId },
    });
    return result.count;
  }
}

