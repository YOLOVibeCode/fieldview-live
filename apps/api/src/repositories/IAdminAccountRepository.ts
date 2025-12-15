/**
 * Admin Account Repository Interfaces (ISP)
 * 
 * Segregated interfaces for AdminAccount CRUD operations.
 */

import type { AdminAccount } from '@prisma/client';

export interface CreateAdminAccountData {
  email: string;
  passwordHash: string;
  role: string;
}

export interface UpdateAdminAccountData {
  passwordHash?: string;
  role?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  status?: string;
  lastLoginAt?: Date | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IAdminAccountReader {
  getById(id: string): Promise<AdminAccount | null>;
  getByEmail(email: string): Promise<AdminAccount | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface IAdminAccountWriter {
  create(data: CreateAdminAccountData): Promise<AdminAccount>;
  update(id: string, data: UpdateAdminAccountData): Promise<AdminAccount>;
}
