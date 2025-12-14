/**
 * Authentication Middleware
 * 
 * JWT authentication for owner endpoints.
 * Session authentication for admin endpoints (to be implemented).
 */

import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '../lib/errors';
import { verifyToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  userId?: string;
  ownerAccountId?: string;
  adminUserId?: string;
  role?: string;
}

/**
 * Owner JWT Authentication Middleware
 * 
 * Validates JWT token and extracts owner account ID.
 */
export function requireOwnerAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Bearer token required'));
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token using JWT library directly (simpler for middleware)
  const payload = verifyToken(token);
  if (!payload) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  // Attach owner account ID to request
  req.ownerAccountId = payload.ownerAccountId;

  next();
}

/**
 * Admin Session Authentication Middleware
 * 
 * Validates session cookie and MFA (if required).
 * TODO: Implement session verification
 */
export function requireAdminAuth(
  _req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  // TODO: Verify session cookie
  // TODO: Check MFA if required for action

  // For now, scaffold returns 401
  return next(new UnauthorizedError('Admin session required'));
}
