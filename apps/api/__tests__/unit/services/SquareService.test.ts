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
      expect(result.connectUrl).toContain('PAYMENTS_WRITE');
      expect(result.state).toBeDefined();
      expect(redisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('square:connect:'),
        600,
        expect.any(String)
      );

      const stored = vi.mocked(redisClient.setex).mock.calls[0]?.[2] as string;
      const parsed = JSON.parse(stored) as { ownerAccountId: string; returnUrl: string };
      expect(parsed.ownerAccountId).toBe('account-1');
      // returnUrl is allowlisted to APP_URL origin; defaults to APP_URL/owners/dashboard otherwise.
      expect(parsed.returnUrl).toBe('http://localhost:4300/owners/dashboard');
    });
  });

  describe('handleConnectCallback', () => {
    it('exchanges code for token and stores merchant ID', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(
        JSON.stringify({ ownerAccountId: 'account-1', returnUrl: 'http://localhost:4300/owners/dashboard' })
      );
      vi.mocked(redisClient.del).mockResolvedValue(1);
      vi.mocked(mockWriter.update).mockResolvedValue({} as any);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'access-token-123',
            merchant_id: 'LSWR97SDRBXWK',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            locations: [{ id: 'LOC-1', status: 'ACTIVE' }],
          }),
        } as Response);

      const result = await service.handleConnectCallback('auth-code', 'csrf-state');

      expect(result.merchantId).toBe('LSWR97SDRBXWK');
      expect(result.returnUrl).toBe('http://localhost:4300/owners/dashboard');
      expect(mockWriter.update).toHaveBeenCalledWith('account-1', {
        payoutProviderRef: 'LSWR97SDRBXWK',
        squareAccessTokenEncrypted: expect.any(String),
        squareRefreshTokenEncrypted: undefined,
        squareTokenExpiresAt: expect.any(Date),
        squareLocationId: 'LOC-1',
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
