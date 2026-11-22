/**
 * Password reset routes for coaches (owner logins).
 *
 * - Anyone may ask for a reset link; the answer never says whether the email has an account.
 * - Admin accounts are not reset by email: whoever controls an admin's inbox could
 *   otherwise replace the password and set up MFA again.
 * - The token travels in the request body, never in the URL, so request logs never hold it.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import type { IPasswordResetService } from '../../services/IPasswordResetService';
import { createPasswordResetRouter } from '../auth.password-reset';

vi.mock('../../middleware/rateLimit', () => {
  const pass = (_req: Request, _res: Response, next: NextFunction): void => next();
  return { passwordResetRequestRateLimit: pass, passwordResetTokenRateLimit: pass };
});

const GENERIC = 'If an account exists with that email, you will receive a password reset link shortly.';
const STRONG_PASSWORD = 'Sideline-Goal-42';

type ServiceMock = {
  requestReset: Mock;
  verifyToken: Mock;
  confirmReset: Mock;
  cleanupExpiredTokens: Mock;
};

let service: ServiceMock;

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/auth/password-reset', createPasswordResetRouter(service as unknown as IPasswordResetService));
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    return res.status(500).json({ error: { code: 'UNEXPECTED', message: String(err) } });
  });
  return a;
}

type ResetBody = {
  success?: boolean;
  valid?: boolean;
  message?: string;
  email?: string;
  userId?: string;
  error?: { code?: string; message?: string };
};

beforeEach(() => {
  service = {
    requestReset: vi.fn().mockResolvedValue({ success: true, message: GENERIC }),
    verifyToken: vi.fn(),
    confirmReset: vi.fn(),
    cleanupExpiredTokens: vi.fn().mockResolvedValue(0),
  };
});

describe('POST /api/auth/password-reset/request', () => {
  it('asks the service for a coach reset and answers with the same message for everyone', async () => {
    const res = await request(app())
      .post('/api/auth/password-reset/request')
      .send({ email: 'Coach@Example.com', userType: 'owner_user' });

    expect(res.status).toBe(200);
    expect((res.body as ResetBody).message).toBe(GENERIC);
    expect(service.requestReset).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'coach@example.com', userType: 'owner_user' })
    );
  });

  it('treats a request without a user type as a coach reset', async () => {
    const res = await request(app()).post('/api/auth/password-reset/request').send({ email: 'coach@example.com' });

    expect(res.status).toBe(200);
    expect(service.requestReset).toHaveBeenCalledWith(expect.objectContaining({ userType: 'owner_user' }));
  });

  it('refuses to reset an admin account by email', async () => {
    const res = await request(app())
      .post('/api/auth/password-reset/request')
      .send({ email: 'admin@example.com', userType: 'admin_account' });

    expect(res.status).toBe(400);
    expect(service.requestReset).not.toHaveBeenCalled();
  });

  it('refuses an address that is not an email', async () => {
    const res = await request(app()).post('/api/auth/password-reset/request').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(service.requestReset).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/password-reset/verify', () => {
  it('says a good token is valid without naming the account', async () => {
    service.verifyToken.mockResolvedValue({
      valid: true,
      email: 'coach@example.com',
      userType: 'owner_user',
      userId: 'user-1',
    });

    const res = await request(app()).post('/api/auth/password-reset/verify').send({ token: 'raw-token' });

    expect(res.status).toBe(200);
    const body = res.body as ResetBody;
    expect(body.valid).toBe(true);
    expect(body.email).toBeUndefined();
    expect(body.userId).toBeUndefined();
    expect(service.verifyToken).toHaveBeenCalledWith('raw-token');
  });

  it('says why a token is not valid', async () => {
    service.verifyToken.mockResolvedValue({
      valid: false,
      error: 'This reset link has expired. Please request a new one.',
    });

    const res = await request(app()).post('/api/auth/password-reset/verify').send({ token: 'old-token' });

    expect(res.status).toBe(200);
    const body = res.body as ResetBody;
    expect(body.valid).toBe(false);
    expect(body.message).toBe('This reset link has expired. Please request a new one.');
  });

  it('no longer takes the token in the URL', async () => {
    const res = await request(app()).get('/api/auth/password-reset/verify/raw-token');

    expect(res.status).toBe(404);
    expect(service.verifyToken).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/password-reset/confirm', () => {
  it('sets the new password', async () => {
    service.confirmReset.mockResolvedValue({ success: true, message: 'Your password has been successfully reset.' });

    const res = await request(app())
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'raw-token', newPassword: STRONG_PASSWORD });

    expect(res.status).toBe(200);
    expect((res.body as ResetBody).success).toBe(true);
    expect(service.confirmReset).toHaveBeenCalledWith({ token: 'raw-token', newPassword: STRONG_PASSWORD });
  });

  it('refuses a weak password before touching the account', async () => {
    const res = await request(app())
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'raw-token', newPassword: 'password' });

    expect(res.status).toBe(400);
    expect(service.confirmReset).not.toHaveBeenCalled();
  });

  it('answers a used or expired link in the API error shape', async () => {
    service.confirmReset.mockResolvedValue({
      success: false,
      message: 'This reset link has already been used. Please request a new one.',
      error: 'This reset link has already been used. Please request a new one.',
    });

    const res = await request(app())
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'used-token', newPassword: STRONG_PASSWORD });

    expect(res.status).toBe(400);
    const body = res.body as ResetBody;
    expect(body.error?.code).toBe('PASSWORD_RESET_FAILED');
    expect(body.error?.message).toBe('This reset link has already been used. Please request a new one.');
  });
});
