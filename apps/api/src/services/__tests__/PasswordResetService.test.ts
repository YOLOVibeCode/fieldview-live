/**
 * Password reset for coaches: the token is random, stored only as a hash, short-lived and
 * single-use, and the request answer never reveals whether an email has an account.
 */
/* eslint-disable @typescript-eslint/unbound-method -- vitest mocks are plain functions */
import crypto from 'crypto';

import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { authEmailService } from '../../lib/authEmailService';
import type { IPasswordResetTokenRepository, PasswordResetTokenData } from '../../repositories/IPasswordResetTokenRepository';
import { PasswordResetService } from '../PasswordResetService';

vi.mock('../../lib/authEmailService', () => ({
  authEmailService: { sendPasswordResetEmail: vi.fn(() => Promise.resolve()) },
}));
vi.mock('../../lib/password', () => ({
  hashPassword: vi.fn((pw: string) => Promise.resolve(`hashed:${pw.length}`)),
}));

const GENERIC = 'If an account exists with that email, you will receive a password reset link shortly.';
const STRONG_PASSWORD = 'Sideline-Goal-42';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

type RepoMock = { [K in keyof IPasswordResetTokenRepository]: Mock };

let repo: RepoMock;
let ownerFindUnique: Mock;
let ownerUpdate: Mock;
let service: PasswordResetService;

function storedToken(overrides: Partial<PasswordResetTokenData> = {}): PasswordResetTokenData {
  return {
    id: 'token-1',
    tokenHash: sha256('raw-token'),
    userType: 'owner_user',
    userId: 'user-1',
    email: 'coach@example.com',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo = {
    findByTokenHash: vi.fn(),
    findUnexpiredByEmail: vi.fn(),
    countRecentByEmail: vi.fn().mockResolvedValue(0),
    findByUserId: vi.fn(),
    create: vi
      .fn()
      .mockImplementation((input: Record<string, unknown>) => Promise.resolve({ id: 'token-1', ...input })),
    markAsUsed: vi.fn(),
    invalidateAllForUser: vi.fn().mockResolvedValue(1),
    deleteExpired: vi.fn().mockResolvedValue(0),
  };
  ownerFindUnique = vi.fn().mockResolvedValue({ id: 'user-1' });
  ownerUpdate = vi.fn().mockResolvedValue({ id: 'user-1' });
  const prisma = {
    ownerUser: { findUnique: ownerFindUnique, update: ownerUpdate },
    adminAccount: { findUnique: vi.fn(), update: vi.fn() },
  } as unknown as PrismaClient;
  service = new PasswordResetService(repo as unknown as IPasswordResetTokenRepository, prisma);
});

describe('requestReset', () => {
  it('stores only a hash of a fresh token, valid for 15 minutes, and emails the token itself', async () => {
    const before = Date.now();

    const result = await service.requestReset({ email: 'coach@example.com', userType: 'owner_user' });

    expect(result).toEqual({ success: true, message: GENERIC });
    expect(repo.create).toHaveBeenCalledTimes(1);
    const stored = ((repo.create.mock.calls as unknown[][])[0]?.[0] ?? {}) as {
      tokenHash: string;
      expiresAt: Date;
      userId: string;
    };
    const sendMock = vi.mocked(authEmailService.sendPasswordResetEmail);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0]?.[0];
    expect(sent?.to).toBe('coach@example.com');
    expect(sent?.token).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenHash).toBe(sha256(sent?.token ?? ''));
    expect(stored.tokenHash).not.toBe(sent?.token);
    expect(stored.userId).toBe('user-1');
    const minutes = (stored.expiresAt.getTime() - before) / 60000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15.1);
  });

  it('gives the same answer for an email with no account, and sends nothing', async () => {
    ownerFindUnique.mockResolvedValue(null);

    const result = await service.requestReset({ email: 'nobody@example.com', userType: 'owner_user' });

    expect(result).toEqual({ success: true, message: GENERIC });
    expect(repo.create).not.toHaveBeenCalled();
    expect(vi.mocked(authEmailService.sendPasswordResetEmail)).not.toHaveBeenCalled();
  });

  it('gives the same answer after three requests in an hour, and sends nothing more', async () => {
    repo.countRecentByEmail.mockResolvedValue(3);

    const result = await service.requestReset({ email: 'coach@example.com', userType: 'owner_user' });

    expect(result).toEqual({ success: true, message: GENERIC });
    expect(repo.create).not.toHaveBeenCalled();
    expect(vi.mocked(authEmailService.sendPasswordResetEmail)).not.toHaveBeenCalled();
  });
});

describe('verifyToken', () => {
  it('finds the token by its hash and accepts a fresh, unused one', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken());

    const result = await service.verifyToken('raw-token');

    expect(repo.findByTokenHash).toHaveBeenCalledWith(sha256('raw-token'));
    expect(result.valid).toBe(true);
  });

  it('refuses an unknown token', async () => {
    repo.findByTokenHash.mockResolvedValue(null);

    expect((await service.verifyToken('guess')).valid).toBe(false);
  });

  it('refuses an expired token', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken({ expiresAt: new Date(Date.now() - 1000) }));

    const result = await service.verifyToken('raw-token');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it('refuses a token that was already used', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken({ usedAt: new Date() }));

    const result = await service.verifyToken('raw-token');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already been used/i);
  });
});

describe('confirmReset', () => {
  it('saves a hash of the new password and spends every open token for that coach', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken());

    const result = await service.confirmReset({ token: 'raw-token', newPassword: STRONG_PASSWORD });

    expect(result.success).toBe(true);
    expect(ownerUpdate).toHaveBeenCalledTimes(1);
    const update = ((ownerUpdate.mock.calls as unknown[][])[0]?.[0] ?? {}) as {
      where: { id: string };
      data: { passwordHash: string };
    };
    expect(update.where.id).toBe('user-1');
    expect(update.data.passwordHash).toBe(`hashed:${STRONG_PASSWORD.length}`);
    expect(update.data.passwordHash).not.toContain(STRONG_PASSWORD);
    expect(repo.invalidateAllForUser).toHaveBeenCalledWith('user-1', 'owner_user');
  });

  it('refuses a weak password and leaves the account alone', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken());

    const result = await service.confirmReset({ token: 'raw-token', newPassword: 'password' });

    expect(result.success).toBe(false);
    expect(ownerUpdate).not.toHaveBeenCalled();
  });

  it('refuses a used token and leaves the account alone', async () => {
    repo.findByTokenHash.mockResolvedValue(storedToken({ usedAt: new Date() }));

    const result = await service.confirmReset({ token: 'raw-token', newPassword: STRONG_PASSWORD });

    expect(result.success).toBe(false);
    expect(ownerUpdate).not.toHaveBeenCalled();
  });
});
