/**
 * Owner Account Repository Interfaces (ISP)
 * 
 * Segregated interfaces for reading and writing owner accounts.
 * 
 * Note: OwnerAccount uses contactEmail (not email) and passwordHash is stored in OwnerUser.
 */

import type { OwnerAccount, OwnerUser } from '@prisma/client';

export interface CreateOwnerAccountData {
  contactEmail: string;
  name: string;
  type: 'individual' | 'association';
  payoutProviderRef?: string; // Square account ID
}

export interface CreateOwnerUserData {
  ownerAccountId: string;
  email: string;
  passwordHash: string;
  role: 'owner_admin' | 'association_admin' | 'association_operator';
}

export interface UpdateOwnerAccountData {
  name?: string;
  payoutProviderRef?: string;
  squareAccessTokenEncrypted?: string;
  squareRefreshTokenEncrypted?: string;
  squareTokenExpiresAt?: Date;
  squareLocationId?: string | null;
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on read operations only.
 */
export interface IOwnerAccountReader {
  findById(id: string): Promise<OwnerAccount | null>;
  findByContactEmail(email: string): Promise<OwnerAccount | null>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on write operations only.
 */
export interface IOwnerAccountWriter {
  create(data: CreateOwnerAccountData): Promise<OwnerAccount>;
  update(id: string, data: UpdateOwnerAccountData): Promise<OwnerAccount>;
}

/**
 * Owner User Reader Interface (ISP)
 */
export interface IOwnerUserReader {
  findByEmail(email: string): Promise<(OwnerUser & { ownerAccount: OwnerAccount }) | null>;
  findByOwnerAccountId(ownerAccountId: string): Promise<OwnerUser[]>;
}

/**
 * Owner User Writer Interface (ISP)
 */
export interface IOwnerUserWriter {
  create(data: CreateOwnerUserData): Promise<OwnerUser>;
}
