/**
 * Coupon Repository Implementation
 *
 * Prisma-based implementation of ICouponReader and ICouponWriter.
 */

import type { PrismaClient, CouponCode, CouponRedemption } from '@prisma/client';

import type {
  ICouponReader,
  ICouponWriter,
  CreateCouponData,
  UpdateCouponData,
  CouponListFilters,
  CouponListResult,
  CreateRedemptionData,
} from '../ICouponRepository';

export class CouponRepository implements ICouponReader, ICouponWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<CouponCode | null> {
    return this.prisma.couponCode.findUnique({
      where: { id },
    });
  }

  async getByCode(code: string): Promise<CouponCode | null> {
    return this.prisma.couponCode.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  async list(filters: CouponListFilters): Promise<CouponListResult> {
    const where: { status?: string; ownerAccountId?: string | null } = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ownerAccountId !== undefined) {
      where.ownerAccountId = filters.ownerAccountId;
    }

    const [coupons, total] = await Promise.all([
      this.prisma.couponCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
      }),
      this.prisma.couponCode.count({ where }),
    ]);

    return { coupons, total };
  }

  async getRedemptionsByViewer(couponId: string, viewerId: string): Promise<CouponRedemption[]> {
    return this.prisma.couponRedemption.findMany({
      where: {
        couponId,
        viewerId,
      },
    });
  }

  async getRedemptionsByPurchase(purchaseId: string): Promise<CouponRedemption | null> {
    return this.prisma.couponRedemption.findFirst({
      where: { purchaseId },
    });
  }

  async create(data: CreateCouponData): Promise<CouponCode> {
    return this.prisma.couponCode.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        ownerAccountId: data.ownerAccountId ?? null,
        gameId: data.gameId ?? null,
        maxUses: data.maxUses ?? null,
        maxUsesPerViewer: data.maxUsesPerViewer ?? 1,
        minPurchaseCents: data.minPurchaseCents ?? null,
        validFrom: data.validFrom ?? new Date(),
        validTo: data.validTo ?? null,
        status: data.status ?? 'active',
        createdByAdminId: data.createdByAdminId,
      },
    });
  }

  async update(id: string, data: UpdateCouponData): Promise<CouponCode> {
    return this.prisma.couponCode.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.validTo !== undefined && { validTo: data.validTo }),
      },
    });
  }

  async incrementUsedCount(id: string): Promise<void> {
    await this.prisma.couponCode.update({
      where: { id },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }

  async createRedemption(data: CreateRedemptionData): Promise<CouponRedemption> {
    return this.prisma.couponRedemption.create({
      data: {
        couponId: data.couponId,
        purchaseId: data.purchaseId,
        viewerId: data.viewerId,
        discountCents: data.discountCents,
      },
    });
  }
}
