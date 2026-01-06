/**
 * Viewer Authentication Middleware
 *
 * Validates viewer JWT tokens for direct stream + chat access.
 * Scoped to gameId to prevent cross-game abuse.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyViewerToken, type ViewerTokenClaims } from '../lib/viewer-jwt';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

export interface ViewerAuthRequest extends Request {
  viewerId?: string;
  gameId?: string;
  displayName?: string;
  slug?: string;
  viewerToken?: ViewerTokenClaims;
}

/**
 * Require viewer authentication via Bearer token
 */
export function requireViewerAuth(
  req: ViewerAuthRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Viewer token required');
    }

    const token = authHeader.substring(7);
    const claims = verifyViewerToken(token);

    // Attach to request
    req.viewerId = claims.viewerId;
    req.gameId = claims.gameId;
    req.displayName = claims.displayName;
    req.slug = claims.slug;
    req.viewerToken = claims;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired viewer token'));
    }
  }
}

/**
 * Require viewer token to match route gameId parameter
 */
export function requireGameMatch(
  req: ViewerAuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const routeGameId = req.params.gameId;
  const tokenGameId = req.gameId;

  if (!tokenGameId) {
    return next(new UnauthorizedError('No game context in token'));
  }

  if (routeGameId && routeGameId !== tokenGameId) {
    return next(new ForbiddenError('Token not valid for this game'));
  }

  next();
}

/**
 * Helper to extract gameId from token (for middleware composition)
 */
export function requireViewerId(req: ViewerAuthRequest): string {
  if (!req.viewerId) {
    throw new UnauthorizedError('Viewer ID not found in request');
  }
  return req.viewerId;
}

/**
 * Helper to extract gameId from token
 */
export function requireGameId(req: ViewerAuthRequest): string {
  if (!req.gameId) {
    throw new UnauthorizedError('Game ID not found in request');
  }
  return req.gameId;
}

