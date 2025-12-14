import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIdempotencyKey, storeIdempotencyKey } from '@/lib/idempotency';
import { redisClient } from '@/lib/redis';

vi.mock('@/lib/redis', () => ({
  redisClient: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

describe('Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkIdempotencyKey', () => {
    it('returns cached response if key exists', async () => {
      const mockResponse = JSON.stringify({ success: true });
      vi.mocked(redisClient.get).mockResolvedValue(mockResponse);

      const result = await checkIdempotencyKey('test-key');

      expect(result.exists).toBe(true);
      expect(result.response).toBe(mockResponse);
    });

    it('returns not exists if key not found', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const result = await checkIdempotencyKey('test-key');

      expect(result.exists).toBe(false);
    });
  });

  describe('storeIdempotencyKey', () => {
    it('stores key with TTL', async () => {
      vi.mocked(redisClient.setex).mockResolvedValue('OK');

      await storeIdempotencyKey('test-key', '{"success":true}');

      expect(redisClient.setex).toHaveBeenCalledWith(
        'idempotency:test-key',
        24 * 60 * 60,
        '{"success":true}'
      );
    });
  });
});
