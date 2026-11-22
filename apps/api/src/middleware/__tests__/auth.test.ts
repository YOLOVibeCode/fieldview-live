import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { UnauthorizedError } from '../../lib/errors';
import { generateToken } from '../../lib/jwt';
import { requireOwnerAuth, type AuthRequest } from '../auth';

function requestWith(authorization?: string): AuthRequest {
  return { headers: authorization ? { authorization } : {} } as AuthRequest;
}

describe('requireOwnerAuth', () => {
  it('puts the account and the login email from the token on the request', () => {
    const token = generateToken({ ownerAccountId: 'account-1', email: 'coach@example.com' });
    const req = requestWith(`Bearer ${token}`);
    const next = vi.fn();

    requireOwnerAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.ownerAccountId).toBe('account-1');
    expect(req.ownerEmail).toBe('coach@example.com');
  });

  it('refuses a request with no token', () => {
    const req = requestWith();
    const next = vi.fn();

    requireOwnerAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(req.ownerAccountId).toBeUndefined();
    expect(req.ownerEmail).toBeUndefined();
  });

  it('refuses a token that is not valid', () => {
    const req = requestWith('Bearer not-a-real-token');
    const next = vi.fn();

    requireOwnerAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(req.ownerEmail).toBeUndefined();
  });
});
