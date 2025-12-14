/**
 * Authentication Middleware Scaffolding
 * 
 * JWT authentication for owner endpoints.
 * Session authentication for admin endpoints (to be implemented).
 */

import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '../lib/errors';

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
 * TODO: Implement JWT verification
 */
export function requireOwnerAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  // TODO: Extract and verify JWT token
  // For now, scaffold returns 401
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Bearer token required'));
  }

  // TODO: Verify JWT and extract ownerAccountId
  // req.ownerAccountId = decoded.ownerAccountId;

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
