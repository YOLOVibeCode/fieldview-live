/**
 * Entitlement Repository Implementation
 * 
 * Prisma-based implementation of IEntitlementReader and IEntitlementWriter.
 */

import type { PrismaClient, Entitlement } from '@prisma/client';

import type {
  IEntitlementReader,
  IEntitlementWriter,
  CreateEntitlementData,
  UpdateEntitlementData,
} from '../IEntitlementRepository';

export class EntitlementRepository implements IEntitlementReader, IEntitlementWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<Entitlement | null> {
    return this.prisma.entitlement.findUnique({
      where: { id },
      include: {
        purchase: true,
      },
    });
  }

  async getByPurchaseId(purchaseId: string): Promise<Entitlement | null> {
    return this.prisma.entitlement.findUnique({
      where: { purchaseId },
      include: {
        purchase: true,
      },
    });
  }

  async getByTokenId(tokenId: string): Promise<Entitlement | null> {
    return this.prisma.entitlement.findUnique({
      where: { tokenId },
      include: {
        purchase: true,
      },
    });
  }

  async create(data: CreateEntitlementData): Promise<Entitlement> {
    return this.prisma.entitlement.create({
      data,
    });
  }

  async update(id: string, data: UpdateEntitlementData): Promise<Entitlement> {
    return this.prisma.entitlement.update({
      where: { id },
      data: {
        ...data,
        revokedAt: data.revokedAt === null ? null : data.revokedAt,
      },
    });
  }
}
