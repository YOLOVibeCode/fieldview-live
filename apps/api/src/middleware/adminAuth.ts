/**
 * Admin Authentication Middleware
 * Session-based authentication for admin endpoints.
 * Validates admin session and sets admin account ID and role from DB.
 */

import type { Response, NextFunction } from 'express';

import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../lib/errors';

import type { AuthRequest } from './auth';

/**
 * Admin Session Authentication Middleware
 * Expects Bearer token from POST /api/admin/login (format: admin_session_{adminAccountId}_{timestamp}).
 */
export function requireAdminAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.cookies as { adminSessionToken?: string } | undefined)?.adminSessionToken;

  if (!sessionToken || typeof sessionToken !== 'string') {
    return next(new UnauthorizedError('Admin session required'));
  }

  const match = sessionToken.match(/^admin_session_([^_]+)_/);
  if (!match || !match[1]) {
    return next(new UnauthorizedError('Invalid session token'));
  }

  const adminAccountId = match[1];
  req.adminUserId = adminAccountId;

  void prisma.adminAccount
    .findUnique({
      where: { id: adminAccountId },
      select: { role: true, status: true },
    })
    .then((account) => {
      if (!account) {
        return next(new UnauthorizedError('Admin account not found'));
      }
      if (account.status !== 'active') {
        return next(new UnauthorizedError('Account is suspended'));
      }
      req.role = account.role;
      next();
    })
    .catch(next);
}

/**
 * Require SuperAdmin Role
 */
export function requireSuperAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  if (req.role !== 'super_admin') {
    return next(new UnauthorizedError('SuperAdmin access required'));
  }
  next();
}
