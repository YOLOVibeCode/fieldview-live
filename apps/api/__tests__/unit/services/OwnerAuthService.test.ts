import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OwnerAuthService } from '@/services/OwnerAuthService';
import { BadRequestError, UnauthorizedError } from '@/lib/errors';
import type {
  IOwnerAccountWriter,
  IOwnerUserReader,
  IOwnerUserWriter,
} from '@/repositories/IOwnerAccountRepository';
import type { OwnerAccount, OwnerUser } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/password');
vi.mock('@/lib/jwt');

describe('OwnerAuthService', () => {
  let service: OwnerAuthService;
  let mockAccountWriter: IOwnerAccountWriter;
  let mockUserReader: IOwnerUserReader;
  let mockUserWriter: IOwnerUserWriter;

  beforeEach(() => {
    mockAccountWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    mockUserReader = {
      findByEmail: vi.fn(),
      findByOwnerAccountId: vi.fn(),
    };
    mockUserWriter = {
      create: vi.fn(),
    };
    service = new OwnerAuthService(mockAccountWriter, mockUserReader, mockUserWriter);
  });

  describe('register', () => {
    it('creates new owner account and user, returns token', async () => {
      const { hashPassword } = await import('@/lib/password');
      const { generateToken } = await import('@/lib/jwt');

      vi.mocked(mockUserReader.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(mockAccountWriter.create).mockResolvedValue({
        id: 'account-1',
        contactEmail: 'test@example.com',
        name: 'Test Owner',
        type: 'individual',
        status: 'pending_verification',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OwnerAccount);
      vi.mocked(mockUserWriter.create).mockResolvedValue({
        id: 'user-1',
        ownerAccountId: 'account-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'owner_admin',
        mfaEnabled: false,
        mfaSecret: null,
        status: 'active',
        createdAt: new Date(),
        lastLoginAt: null,
      } as OwnerUser);
      vi.mocked(generateToken).mockReturnValue('jwt-token');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test Owner',
        type: 'individual',
      });

      expect(result.account.contactEmail).toBe('test@example.com');
      expect(result.token.token).toBe('jwt-token');
      expect(mockAccountWriter.create).toHaveBeenCalledWith({
        contactEmail: 'test@example.com',
        name: 'Test Owner',
        type: 'individual',
      });
      expect(mockUserWriter.create).toHaveBeenCalledWith({
        ownerAccountId: 'account-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'owner_admin',
      });
    });

    it('throws BadRequestError if email already exists', async () => {
      vi.mocked(mockUserReader.findByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        ownerAccount: {} as OwnerAccount,
      } as OwnerUser & { ownerAccount: OwnerAccount });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test Owner',
          type: 'individual',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('login', () => {
    it('returns account and token for valid credentials', async () => {
      const { verifyPassword } = await import('@/lib/password');
      const { generateToken } = await import('@/lib/jwt');

      const mockAccount = {
        id: 'account-1',
        contactEmail: 'test@example.com',
        name: 'Test Owner',
        type: 'individual',
        status: 'active',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OwnerAccount;

      const mockUser = {
        id: 'user-1',
        ownerAccountId: 'account-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'owner_admin',
        mfaEnabled: false,
        mfaSecret: null,
        status: 'active',
        createdAt: new Date(),
        lastLoginAt: null,
        ownerAccount: mockAccount,
      } as OwnerUser & { ownerAccount: OwnerAccount };

      vi.mocked(mockUserReader.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('jwt-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.account.contactEmail).toBe('test@example.com');
      expect(result.token.token).toBe('jwt-token');
    });

    it('throws UnauthorizedError if email not found', async () => {
      vi.mocked(mockUserReader.findByEmail).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError if password invalid', async () => {
      const { verifyPassword } = await import('@/lib/password');

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        ownerAccount: {} as OwnerAccount,
      } as OwnerUser & { ownerAccount: OwnerAccount };

      vi.mocked(mockUserReader.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
