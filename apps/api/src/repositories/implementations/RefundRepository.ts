/**
 * Refund Repository Implementation
 * 
 * Prisma-based implementation of IRefundReader and IRefundWriter.
 */

import type { PrismaClient, Refund } from '@prisma/client';

import type {
  IRefundReader,
  IRefundWriter,
  CreateRefundData,
  UpdateRefundData,
} from '../IRefundRepository';

export class RefundRepository implements IRefundReader, IRefundWriter {
  constructor(private prisma: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getById(id: string): Promise<(Refund & { purchase: any }) | null> {
    return this.prisma.refund.findUnique({
      where: { id },
      include: {
        purchase: {
          include: {
            game: true,
            viewer: true,
          },
        },
      },
    }) as Promise<(Refund & { purchase: any }) | null>;
  }

  async getByPurchaseId(purchaseId: string): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { purchaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateRefundData): Promise<Refund> {
    return this.prisma.refund.create({
      data: {
        purchaseId: data.purchaseId,
        amountCents: data.amountCents,
        reasonCode: data.reasonCode,
        issuedBy: data.issuedBy,
        ruleVersion: data.ruleVersion,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        telemetrySummary: data.telemetrySummary as any, // Prisma JSON type
      },
    });
  }

  async update(id: string, data: UpdateRefundData): Promise<Refund> {
    return this.prisma.refund.update({
      where: { id },
      data: {
        processedAt: data.processedAt === null ? null : data.processedAt,
      },
    });
  }
}
