/**
 * Ledger Repository Implementation (Prisma)
 *
 * Implements ILedgerReader and ILedgerWriter.
 */

import { PrismaClient, type LedgerEntry } from '@prisma/client';

import type {
  ILedgerReader,
  ILedgerWriter,
  CreateLedgerEntryData,
} from '../ILedgerRepository';

export class LedgerRepository implements ILedgerReader, ILedgerWriter {
  constructor(private prisma: PrismaClient) {}

  async findByOwnerAccountId(ownerAccountId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { ownerAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReference(referenceType: string, referenceId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: {
        referenceType,
        referenceId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBalance(ownerAccountId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { ownerAccountId },
      _sum: {
        amountCents: true,
      },
    });
    return result._sum.amountCents || 0;
  }

  async create(data: CreateLedgerEntryData): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.create({
      data: {
        ownerAccountId: data.ownerAccountId,
        type: data.type,
        amountCents: data.amountCents,
        currency: data.currency,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
      },
    });
  }
}

