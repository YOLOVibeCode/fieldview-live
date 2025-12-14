/**
 * Purchase Repository Interfaces (ISP)
 * 
 * Segregated interfaces for Purchase CRUD operations.
 */

import type { Purchase } from '@prisma/client';

export interface CreatePurchaseData {
  gameId: string;
  viewerId: string;
  amountCents: number;
  currency?: string;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
  status: string;
  paymentProviderPaymentId?: string;
  paymentProviderCustomerId?: string;
}

export interface UpdatePurchaseData {
  status?: string;
  paymentProviderPaymentId?: string;
  paymentProviderCustomerId?: string;
  paidAt?: Date | null;
  failedAt?: Date | null;
  refundedAt?: Date | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IPurchaseReader {
  getById(id: string): Promise<Purchase | null>;
  getByPaymentProviderId(paymentProviderPaymentId: string): Promise<Purchase | null>;
  listByGameId(gameId: string): Promise<Purchase[]>;
  listByViewerId(viewerId: string): Promise<Purchase[]>;
}

/**
 * Writer Interface (ISP)
 */
export interface IPurchaseWriter {
  create(data: CreatePurchaseData): Promise<Purchase>;
  update(id: string, data: UpdatePurchaseData): Promise<Purchase>;
}
