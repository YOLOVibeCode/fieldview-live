/**
 * Admin JWT Utilities
 * 
 * Token generation and verification for direct stream admin authentication.
 */

import jwt from 'jsonwebtoken';

export interface AdminJwtPayload {
  slug: string;
  role: 'admin';
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_JWT_EXPIRES_IN = '1h'; // Admin tokens expire in 1 hour

/**
 * Generate an admin JWT token for a direct stream
 */
export function generateAdminJwt(payload: AdminJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ADMIN_JWT_EXPIRES_IN,
  });
}

/**
 * Verify an admin JWT token
 */
export function verifyAdminJwt(token: string): AdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    
    // Validate payload structure
    if (!decoded.slug || decoded.role !== 'admin') {
      return null;
    }
    
    return decoded;
  } catch {
    return null;
  }
}

