/**
 * Ledger Repository Interfaces (ISP)
 *
 * Segregated interfaces for reading and writing ledger entries.
 */

import type { LedgerEntry } from '@prisma/client';

export interface CreateLedgerEntryData {
  ownerAccountId: string;
  type: 'charge' | 'platform_fee' | 'processor_fee' | 'refund' | 'payout';
  amountCents: number; // Positive for credits, negative for debits
  currency: string;
  referenceType: 'purchase' | 'refund' | 'payout';
  referenceId?: string;
  description: string;
}

/**
 * Reader Interface (ISP)
 */
export interface ILedgerReader {
  findByOwnerAccountId(ownerAccountId: string): Promise<LedgerEntry[]>;
  findByReference(referenceType: string, referenceId: string): Promise<LedgerEntry[]>;
  getBalance(ownerAccountId: string): Promise<number>; // Sum of all entries in cents
}

/**
 * Writer Interface (ISP)
 */
export interface ILedgerWriter {
  create(data: CreateLedgerEntryData): Promise<LedgerEntry>;
}

