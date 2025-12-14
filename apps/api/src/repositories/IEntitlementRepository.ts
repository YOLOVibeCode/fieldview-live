/**
 * Entitlement Repository Interfaces (ISP)
 * 
 * Segregated interfaces for Entitlement CRUD operations.
 */

import type { Entitlement } from '@prisma/client';

export interface CreateEntitlementData {
  purchaseId: string;
  tokenId: string;
  validFrom: Date;
  validTo: Date;
  status?: string;
}

export interface UpdateEntitlementData {
  status?: string;
  revokedAt?: Date | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IEntitlementReader {
  getById(id: string): Promise<Entitlement | null>;
  getByPurchaseId(purchaseId: string): Promise<Entitlement | null>;
  getByTokenId(tokenId: string): Promise<Entitlement | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface IEntitlementWriter {
  create(data: CreateEntitlementData): Promise<Entitlement>;
  update(id: string, data: UpdateEntitlementData): Promise<Entitlement>;
}
