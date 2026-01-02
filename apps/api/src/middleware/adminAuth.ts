/**
 * Admin Authentication Middleware
 * 
 * Session-based authentication for admin endpoints.
 * Validates admin session and extracts admin account info.
 */

import type { Response, NextFunction } from 'express';

import { UnauthorizedError } from '../lib/errors';

import type { AuthRequest } from './auth';

/**
 * Admin Session Authentication Middleware
 * 
 * Validates admin session token and extracts admin account ID and role.
 * TODO: In production, implement proper session management (express-session with Redis)
 */
export function requireAdminAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  // Extract session token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const sessionToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7)
    : (req.cookies as { adminSessionToken?: string } | undefined)?.adminSessionToken;

  if (!sessionToken || typeof sessionToken !== 'string') {
    return next(new UnauthorizedError('Admin session required'));
  }

  // TODO: In production, verify session token against session store
  // For now, parse token to extract admin account ID
  // Format: admin_session_{adminAccountId}_{timestamp}
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const match = sessionToken.match(/^admin_session_([^_]+)_/);
  if (!match || !match[1]) {
    return next(new UnauthorizedError('Invalid session token'));
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const adminAccountId = match[1];
  
  // Set admin info on request
  req.adminUserId = adminAccountId;
  // TODO: Fetch admin role from database
  req.role = 'support_admin'; // Default, should be fetched from session/database

  next();
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
