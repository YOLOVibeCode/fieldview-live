/**
 * Refund Repository Interfaces (ISP)
 * 
 * Segregated interfaces for Refund CRUD operations.
 */

import type { Refund } from '@prisma/client';

export interface CreateRefundData {
  purchaseId: string;
  amountCents: number;
  reasonCode: string;
  issuedBy: string;
  ruleVersion: string;
  telemetrySummary: Record<string, unknown>;
}

export interface UpdateRefundData {
  processedAt?: Date | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IRefundReader {
  getById(id: string): Promise<Refund | null>;
  getByPurchaseId(purchaseId: string): Promise<Refund[]>;
}

/**
 * Writer Interface (ISP)
 */
export interface IRefundWriter {
  create(data: CreateRefundData): Promise<Refund>;
  update(id: string, data: UpdateRefundData): Promise<Refund>;
}
