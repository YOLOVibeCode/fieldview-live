/**
 * Purchase Repository Implementation
 * 
 * Prisma-based implementation of IPurchaseReader and IPurchaseWriter.
 */

import type { PrismaClient, Purchase } from '@prisma/client';

import type {
  IPurchaseReader,
  IPurchaseWriter,
  CreatePurchaseData,
  UpdatePurchaseData,
} from '../IPurchaseRepository';

export class PurchaseRepository implements IPurchaseReader, IPurchaseWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<Purchase | null> {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: {
        game: true,
        viewer: true,
      },
    });
  }

  async getByPaymentProviderId(paymentProviderPaymentId: string): Promise<Purchase | null> {
    return this.prisma.purchase.findFirst({
      where: { paymentProviderPaymentId },
      include: {
        game: true,
        viewer: true,
      },
    });
  }

  async listByGameId(gameId: string): Promise<Purchase[]> {
    return this.prisma.purchase.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByViewerId(viewerId: string): Promise<Purchase[]> {
    return this.prisma.purchase.findMany({
      where: { viewerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreatePurchaseData): Promise<Purchase> {
    return this.prisma.purchase.create({
      data,
    });
  }

  async update(id: string, data: UpdatePurchaseData): Promise<Purchase> {
    return this.prisma.purchase.update({
      where: { id },
      data: {
        ...data,
        paidAt: data.paidAt === null ? null : data.paidAt,
        failedAt: data.failedAt === null ? null : data.failedAt,
        refundedAt: data.refundedAt === null ? null : data.refundedAt,
      },
    });
  }
}
