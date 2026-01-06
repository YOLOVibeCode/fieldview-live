/**
 * Unit tests for ChatRepository (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatRepository } from '@/repositories/implementations/ChatRepository';
import type { PrismaClient } from '@prisma/client';

describe('ChatRepository', () => {
  let repository: ChatRepository;
  let mockPrisma: {
    gameChatMessage: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      gameChatMessage: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    repository = new ChatRepository(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  describe('getRecentMessages', () => {
    it('retrieves messages newest first with default limit', async () => {
      const mockMessages = [
        { id: '2', gameId: 'game-1', message: 'Second', createdAt: new Date('2024-01-02') },
        { id: '1', gameId: 'game-1', message: 'First', createdAt: new Date('2024-01-01') },
      ];
      mockPrisma.gameChatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await repository.getRecentMessages('game-1');

      expect(result).toEqual(mockMessages);
      expect(mockPrisma.gameChatMessage.findMany).toHaveBeenCalledWith({
        where: { gameId: 'game-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('respects custom limit', async () => {
      mockPrisma.gameChatMessage.findMany.mockResolvedValue([]);

      await repository.getRecentMessages('game-1', 10);

      expect(mockPrisma.gameChatMessage.findMany).toHaveBeenCalledWith({
        where: { gameId: 'game-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });

  describe('countMessages', () => {
    it('returns message count for a game', async () => {
      mockPrisma.gameChatMessage.count.mockResolvedValue(42);

      const result = await repository.countMessages('game-1');

      expect(result).toBe(42);
      expect(mockPrisma.gameChatMessage.count).toHaveBeenCalledWith({
        where: { gameId: 'game-1' },
      });
    });
  });

  describe('createMessage', () => {
    it('creates a new chat message', async () => {
      const messageData = {
        gameId: 'game-1',
        viewerId: 'viewer-1',
        displayName: 'John D.',
        message: 'Hello world',
      };
      const mockCreated = { id: 'msg-1', ...messageData, createdAt: new Date() };
      mockPrisma.gameChatMessage.create.mockResolvedValue(mockCreated);

      const result = await repository.createMessage(messageData);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.gameChatMessage.create).toHaveBeenCalledWith({
        data: messageData,
      });
    });
  });

  describe('deleteMessage', () => {
    it('deletes a message by ID', async () => {
      mockPrisma.gameChatMessage.delete.mockResolvedValue({});

      await repository.deleteMessage('msg-1');

      expect(mockPrisma.gameChatMessage.delete).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
      });
    });
  });

  describe('deleteGameMessages', () => {
    it('deletes all messages for a game and returns count', async () => {
      mockPrisma.gameChatMessage.deleteMany.mockResolvedValue({ count: 15 });

      const result = await repository.deleteGameMessages('game-1');

      expect(result).toBe(15);
      expect(mockPrisma.gameChatMessage.deleteMany).toHaveBeenCalledWith({
        where: { gameId: 'game-1' },
      });
    });
  });
});

