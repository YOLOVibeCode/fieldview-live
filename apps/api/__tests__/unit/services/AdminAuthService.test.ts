import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuthService } from '@/services/AdminAuthService';
import { BadRequestError, UnauthorizedError } from '@/lib/errors';
import type { IAdminAccountReader, IAdminAccountWriter } from '@/repositories/IAdminAccountRepository';
import type { AdminAccount } from '@prisma/client';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Mock QRCode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test'),
  },
}));

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockAdminAccountReader: IAdminAccountReader;
  let mockAdminAccountWriter: IAdminAccountWriter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdminAccountReader = {
      getById: vi.fn(),
      getByEmail: vi.fn(),
    };
    mockAdminAccountWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };

    service = new AdminAuthService(mockAdminAccountReader, mockAdminAccountWriter);
  });

  describe('login', () => {
    it('logs in successfully without MFA', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'support_admin',
        mfaEnabled: false,
        mfaSecret: null,
        status: 'active',
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getByEmail).mockResolvedValue(adminAccount);
      vi.mocked(mockAdminAccountWriter.update).mockResolvedValue(adminAccount);

      const response = await service.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(response.adminAccount.id).toBe('admin-1');
      expect(response.mfaRequired).toBe(false);
      expect(response.sessionToken).toBeTruthy();
      expect(mockAdminAccountWriter.update).toHaveBeenCalledWith('admin-1', {
        lastLoginAt: expect.any(Date),
      });
    });

    it('requires MFA token when MFA is enabled', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'support_admin',
        mfaEnabled: true,
        mfaSecret: 'TEST_SECRET',
        status: 'active',
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getByEmail).mockResolvedValue(adminAccount);

      const response = await service.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(response.mfaRequired).toBe(true);
      expect(response.sessionToken).toBe('');
    });

    it('verifies MFA token and logs in successfully', async () => {
      const secret = speakeasy.generateSecret({ name: 'Test', issuer: 'FieldView' });
      const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'support_admin',
        mfaEnabled: true,
        mfaSecret: secret.base32,
        status: 'active',
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getByEmail).mockResolvedValue(adminAccount);
      vi.mocked(mockAdminAccountWriter.update).mockResolvedValue(adminAccount);

      const response = await service.login({
        email: 'admin@example.com',
        password: 'password123',
        mfaToken: token,
      });

      expect(response.mfaRequired).toBe(false);
      expect(response.sessionToken).toBeTruthy();
    });

    it('throws UnauthorizedError for invalid password', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'support_admin',
        mfaEnabled: false,
        mfaSecret: null,
        status: 'active',
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getByEmail).mockResolvedValue(adminAccount);

      await expect(
        service.login({
          email: 'admin@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for suspended account', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'support_admin',
        mfaEnabled: false,
        mfaSecret: null,
        status: 'suspended',
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getByEmail).mockResolvedValue(adminAccount);

      await expect(
        service.login({
          email: 'admin@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('setupMfa', () => {
    it('sets up MFA and returns QR code', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        mfaEnabled: false,
        mfaSecret: null,
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getById).mockResolvedValue(adminAccount);
      vi.mocked(mockAdminAccountWriter.update).mockResolvedValue(adminAccount);

      const response = await service.setupMfa('admin-1');

      expect(response.secret).toBeTruthy();
      expect(response.qrCodeUrl).toBe('data:image/png;base64,test');
      expect(mockAdminAccountWriter.update).toHaveBeenCalledWith('admin-1', {
        mfaSecret: expect.any(String),
      });
    });

    it('throws BadRequestError if MFA already enabled', async () => {
      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        mfaEnabled: true,
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getById).mockResolvedValue(adminAccount);

      await expect(service.setupMfa('admin-1')).rejects.toThrow(BadRequestError);
    });
  });

  describe('verifyMfa', () => {
    it('verifies MFA token and enables MFA', async () => {
      const secret = speakeasy.generateSecret({ name: 'Test', issuer: 'FieldView' });
      const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        mfaEnabled: false,
        mfaSecret: secret.base32,
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getById).mockResolvedValue(adminAccount);
      vi.mocked(mockAdminAccountWriter.update).mockResolvedValue({
        ...adminAccount,
        mfaEnabled: true,
      });

      const verified = await service.verifyMfa('admin-1', token);

      expect(verified).toBe(true);
      expect(mockAdminAccountWriter.update).toHaveBeenCalledWith('admin-1', {
        mfaEnabled: true,
      });
    });

    it('returns false for invalid token', async () => {
      const secret = speakeasy.generateSecret({ name: 'Test', issuer: 'FieldView' });

      const adminAccount = {
        id: 'admin-1',
        email: 'admin@example.com',
        mfaEnabled: false,
        mfaSecret: secret.base32,
      } as AdminAccount;

      vi.mocked(mockAdminAccountReader.getById).mockResolvedValue(adminAccount);

      const verified = await service.verifyMfa('admin-1', '000000');

      expect(verified).toBe(false);
    });
  });
});
