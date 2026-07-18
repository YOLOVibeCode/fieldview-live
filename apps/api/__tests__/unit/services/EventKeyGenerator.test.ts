/**
 * Event Key Generator Unit Tests (TDD)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IEventReaderRepo } from '@/repositories/IEventRepository';
import { EventKeyGenerator } from '@/services/EventKeyGenerator';

describe('EventKeyGenerator', () => {
  let mockEventReader: IEventReaderRepo;
  let generator: EventKeyGenerator;

  beforeEach(() => {
    mockEventReader = {
      getEventById: vi.fn(),
      getEventByCanonicalPath: vi.fn(),
      getEventByChannelIdAndUrlKey: vi.fn(),
      listEvents: vi.fn(),
      countEventsByChannelIdAndUrlKey: vi.fn(),
    } as unknown as IEventReaderRepo;

    generator = new EventKeyGenerator(mockEventReader);
  });

  describe('generateUrlKey', () => {
    it('should generate URL key in YYYYMMDDHHmm format', () => {
      // Use Date.UTC to create a date in UTC
      const date = new Date(Date.UTC(2025, 0, 30, 14, 30, 0)); // Month is 0-indexed
      const key = generator.generateUrlKey(date);
      expect(key).toBe('202501301430');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(Date.UTC(2025, 0, 5, 9, 5, 0));
      const key = generator.generateUrlKey(date);
      expect(key).toBe('202501050905');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(Date.UTC(2025, 0, 30, 0, 0, 0));
      const key = generator.generateUrlKey(date);
      expect(key).toBe('202501300000');
    });
  });

  describe('ensureUniqueKey', () => {
    it('should return base key if no collision exists', async () => {
      vi.mocked(mockEventReader.countEventsByChannelIdAndUrlKey).mockResolvedValue(0);

      const uniqueKey = await generator.ensureUniqueKey('channel-123', '202501301430');
      expect(uniqueKey).toBe('202501301430');
      expect(mockEventReader.countEventsByChannelIdAndUrlKey).toHaveBeenCalledWith('channel-123', '202501301430');
    });

    it('should append suffix if collision exists', async () => {
      vi.mocked(mockEventReader.countEventsByChannelIdAndUrlKey)
        .mockResolvedValueOnce(1) // First check finds collision
        .mockResolvedValueOnce(0); // Second check (with suffix) finds no collision

      const uniqueKey = await generator.ensureUniqueKey('channel-123', '202501301430');
      expect(uniqueKey).toBe('202501301430-2');
      expect(mockEventReader.countEventsByChannelIdAndUrlKey).toHaveBeenCalledTimes(2);
    });

    it('should increment suffix until unique', async () => {
      vi.mocked(mockEventReader.countEventsByChannelIdAndUrlKey)
        .mockResolvedValueOnce(1) // First collision
        .mockResolvedValueOnce(1) // Second collision
        .mockResolvedValueOnce(0); // Third check finds no collision

      const uniqueKey = await generator.ensureUniqueKey('channel-123', '202501301430');
      expect(uniqueKey).toBe('202501301430-3');
      expect(mockEventReader.countEventsByChannelIdAndUrlKey).toHaveBeenCalledTimes(3);
    });

    it('should throw error after 999 attempts', async () => {
      vi.mocked(mockEventReader.countEventsByChannelIdAndUrlKey).mockResolvedValue(1); // Always collision

      await expect(generator.ensureUniqueKey('channel-123', '202501301430')).rejects.toThrow(
        'Unable to generate unique URL key after 999 attempts'
      );
    });
  });
});

