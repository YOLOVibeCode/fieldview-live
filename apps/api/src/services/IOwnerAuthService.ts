/**
 * Owner Authentication Service Interfaces (ISP)
 * 
 * Segregated interfaces for authentication operations.
 */

import type { OwnerAccount, OwnerUser } from '@prisma/client';

export interface OwnerRegistrationData {
  email: string;
  password: string;
  name: string;
  type: 'individual' | 'association';
}

export interface OwnerLoginData {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on authentication verification only.
 */
export interface IOwnerAuthReader {
  verifyPassword(user: OwnerUser, password: string): Promise<boolean>;
  verifyToken(token: string): { ownerAccountId: string } | null;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on authentication creation only.
 */
export interface IOwnerAuthWriter {
  register(data: OwnerRegistrationData): Promise<{ account: OwnerAccount; token: AuthToken }>;
  login(data: OwnerLoginData): Promise<{ account: OwnerAccount; token: AuthToken }>;
}
