import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SquareService } from '@/services/SquareService';
import { BadRequestError } from '@/lib/errors';
import { redisClient } from '@/lib/redis';
import type { IOwnerAccountWriter } from '@/repositories/IOwnerAccountRepository';

// Mock dependencies
vi.mock('@/lib/redis', () => ({
  redisClient: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('SquareService', () => {
  let service: SquareService;
  let mockWriter: IOwnerAccountWriter;

  beforeEach(() => {
    mockWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new SquareService(mockWriter);
    vi.clearAllMocks();
  });

  describe('generateConnectUrl', () => {
    it('generates Square Connect URL with CSRF state', async () => {
      vi.mocked(redisClient.setex).mockResolvedValue('OK');

      const result = await service.generateConnectUrl('account-1', 'http://localhost:3000/dashboard');

      expect(result.connectUrl).toContain('connect.squareup');
      expect(result.connectUrl).toContain('client_id');
      expect(result.state).toBeDefined();
      expect(redisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('square:connect:'),
        600,
        'account-1'
      );
    });
  });

  describe('handleConnectCallback', () => {
    it('exchanges code for token and stores merchant ID', async () => {
      vi.mocked(redisClient.get).mockResolvedValue('account-1');
      vi.mocked(redisClient.del).mockResolvedValue(1);
      vi.mocked(mockWriter.update).mockResolvedValue({} as any);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access-token-123',
          merchant_id: 'LSWR97SDRBXWK',
        }),
      } as Response);

      const result = await service.handleConnectCallback('auth-code', 'csrf-state');

      expect(result.merchantId).toBe('LSWR97SDRBXWK');
      expect(mockWriter.update).toHaveBeenCalledWith('account-1', {
        payoutProviderRef: 'LSWR97SDRBXWK',
      });
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('throws BadRequestError if state invalid', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      await expect(
        service.handleConnectCallback('auth-code', 'invalid-state')
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError if token exchange fails', async () => {
      vi.mocked(redisClient.get).mockResolvedValue('account-1');
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      await expect(
        service.handleConnectCallback('auth-code', 'csrf-state')
      ).rejects.toThrow(BadRequestError);
    });
  });
});
