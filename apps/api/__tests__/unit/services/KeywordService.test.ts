import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeywordService } from '@/services/KeywordService';
import type { IGameReader } from '@/repositories/IGameRepository';

describe('KeywordService', () => {
  let service: KeywordService;
  let mockGameReader: IGameReader;

  beforeEach(() => {
    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
    };
    service = new KeywordService(mockGameReader);
  });

  describe('validateKeyword', () => {
    it('validates correct keyword format', () => {
      expect(service.validateKeyword('ABCDEF')).toBe(true);
      expect(service.validateKeyword('XYZ234')).toBe(true);
      expect(service.validateKeyword('234567')).toBe(true);
    });

    it('rejects keywords with wrong length', () => {
      expect(service.validateKeyword('ABCDE')).toBe(false); // Too short
      expect(service.validateKeyword('ABCDEFG')).toBe(false); // Too long
    });

    it('rejects keywords with invalid characters', () => {
      expect(service.validateKeyword('ABCDE1')).toBe(false); // Contains '1'
      expect(service.validateKeyword('ABCDE0')).toBe(false); // Contains '0'
      expect(service.validateKeyword('ABCDEI')).toBe(false); // Contains 'I'
      expect(service.validateKeyword('ABCDEO')).toBe(false); // Contains 'O'
    });
  });

  describe('generateUniqueKeyword', () => {
    it('generates unique keyword when no collision', async () => {
      vi.mocked(mockGameReader.existsKeywordCode).mockResolvedValue(false);

      const keyword = await service.generateUniqueKeyword();

      expect(keyword).toHaveLength(6);
      expect(service.validateKeyword(keyword)).toBe(true);
      expect(mockGameReader.existsKeywordCode).toHaveBeenCalledTimes(1);
    });

    it('retries on collision', async () => {
      vi.mocked(mockGameReader.existsKeywordCode)
        .mockResolvedValueOnce(true) // First collision
        .mockResolvedValueOnce(true) // Second collision
        .mockResolvedValueOnce(false); // Success

      const keyword = await service.generateUniqueKeyword();

      expect(keyword).toHaveLength(6);
      expect(service.validateKeyword(keyword)).toBe(true);
      expect(mockGameReader.existsKeywordCode).toHaveBeenCalledTimes(3);
    });

    it('throws error after max retries', async () => {
      vi.mocked(mockGameReader.existsKeywordCode).mockResolvedValue(true);

      await expect(service.generateUniqueKeyword()).rejects.toThrow(
        'Failed to generate unique keyword after 10 attempts'
      );
    });
  });
});
