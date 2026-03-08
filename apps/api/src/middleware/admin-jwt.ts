/**
 * Admin JWT Middleware
 * 
 * Validates JWT tokens for direct stream admin operations.
 * Expects token in Authorization header: "Bearer <token>"
 */

import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger';
import { UnauthorizedError, ForbiddenError, AppError } from '../lib/errors';

export interface AdminJwtPayload {
  slug: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

// Extend Express Request to include admin data
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export const validateAdminToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      throw new AppError('INTERNAL_ERROR', 'Server configuration error', 500);
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as AdminJwtPayload;

    // Verify the slug in the token matches the slug in the URL
    const urlSlug = req.params.slug?.toLowerCase();
    if (urlSlug && decoded.slug !== urlSlug) {
      throw new ForbiddenError('Token not valid for this stream');
    }

    // Attach admin data to request
    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }

    logger.error({ error }, 'Error validating admin token');
    next(error);
  }
};

// Export as both names for compatibility
export const adminJwtAuth = validateAdminToken;

