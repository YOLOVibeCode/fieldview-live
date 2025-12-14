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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getById(id: string): Promise<(Purchase & { game: any; viewer: any }) | null> {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: {
        game: true,
        viewer: true,
      },
    }) as Promise<(Purchase & { game: any; viewer: any }) | null>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getByPaymentProviderId(paymentProviderPaymentId: string): Promise<(Purchase & { game: any; viewer: any }) | null> {
    return this.prisma.purchase.findFirst({
      where: { paymentProviderPaymentId },
      include: {
        game: true,
        viewer: true,
      },
    }) as Promise<(Purchase & { game: any; viewer: any }) | null>;
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
