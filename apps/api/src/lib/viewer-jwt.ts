/**
 * Viewer JWT utilities
 *
 * Issues short-lived tokens scoped to a specific game for chat + stream access.
 * Tokens expire after 24 hours and must be scoped to gameId to prevent cross-game abuse.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const DEFAULT_EXPIRY = 24 * 60 * 60; // 24 hours

export interface ViewerTokenPayload {
  viewerId: string;
  gameId: string;
  slug: string;
  displayName: string;
}

export interface ViewerTokenClaims extends ViewerTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Generate a viewer token for a specific game session
 */
export function generateViewerToken(
  payload: ViewerTokenPayload,
  options?: { expiresIn?: number }
): string {
  const expiresIn = options?.expiresIn ?? DEFAULT_EXPIRY;

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
}

/**
 * Verify and decode a viewer token
 */
export function verifyViewerToken(token: string): ViewerTokenClaims {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ViewerTokenClaims;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Format display name for privacy (First L.)
 */
export function formatDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  
  if (!first && !last) {
    return 'Anonymous';
  }
  
  if (!last) {
    return first;
  }
  
  const lastInitial = last[0]?.toUpperCase() || '';
  return `${first} ${lastInitial}.`;
}

