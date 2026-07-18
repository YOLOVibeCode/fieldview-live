import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { OwnerAccount } from '@prisma/client';

import { SquareOwnerClientService } from '@/services/SquareOwnerClientService';
import type { IOwnerAccountWriter } from '@/repositories/IOwnerAccountRepository';

vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn((ciphertext: string) => ciphertext.replace(/^enc:/, '')),
  encrypt: vi.fn((plaintext: string) => `enc:${plaintext}`),
}));

vi.mock('square', () => ({
  SquareClient: vi.fn().mockImplementation(() => ({})),
  SquareEnvironment: {
    Production: 'production',
    Sandbox: 'sandbox',
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('SquareOwnerClientService', () => {
  let mockWriter: IOwnerAccountWriter;
  let service: SquareOwnerClientService;

  beforeEach(() => {
    process.env.SQUARE_APPLICATION_ID = 'test-app-id';
    process.env.SQUARE_APPLICATION_SECRET = 'test-app-secret';
    mockWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new SquareOwnerClientService(mockWriter);
    vi.clearAllMocks();
  });

  it('refreshes expired owner token and persists new tokens', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: '2099-01-01T00:00:00.000Z',
      }),
    } as Response);

    const owner = {
      id: 'owner-1',
      squareAccessTokenEncrypted: 'enc:old-access',
      squareRefreshTokenEncrypted: 'enc:old-refresh',
      squareTokenExpiresAt: new Date(Date.now() - 1000),
    } as unknown as OwnerAccount;

    const client = await service.getClient(owner);

    expect(client).not.toBeNull();
    expect(mockWriter.update).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({
        squareAccessTokenEncrypted: 'enc:new-access',
        squareRefreshTokenEncrypted: 'enc:new-refresh',
        squareTokenExpiresAt: expect.any(Date),
      })
    );
  });

  it('does not refresh when token is not near expiry', async () => {
    const owner = {
      id: 'owner-1',
      squareAccessTokenEncrypted: 'enc:valid-access',
      squareRefreshTokenEncrypted: 'enc:valid-refresh',
      squareTokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    } as unknown as OwnerAccount;

    const client = await service.getClient(owner);

    expect(client).not.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockWriter.update).not.toHaveBeenCalled();
  });
});


