/**
 * Coupon Repository Interfaces (ISP)
 *
 * Segregated interfaces for CouponCode CRUD operations.
 */

import type { CouponCode, CouponRedemption } from '@prisma/client';

export interface CreateCouponData {
  code: string;
  discountType: 'percentage' | 'fixed_cents';
  discountValue: number;
  ownerAccountId?: string | null;
  gameId?: string | null;
  maxUses?: number | null;
  maxUsesPerViewer?: number;
  minPurchaseCents?: number | null;
  validFrom?: Date;
  validTo?: Date | null;
  status?: string;
  createdByAdminId: string;
}

export interface UpdateCouponData {
  status?: string;
  maxUses?: number | null;
  validTo?: Date | null;
}

export interface CouponListFilters {
  status?: string;
  ownerAccountId?: string | null;
  limit?: number;
  offset?: number;
}

export interface CouponListResult {
  coupons: CouponCode[];
  total: number;
}

export interface CreateRedemptionData {
  couponId: string;
  purchaseId: string;
  viewerId: string;
  discountCents: number;
}

/**
 * Reader Interface (ISP)
 */
export interface ICouponReader {
  getById(id: string): Promise<CouponCode | null>;
  getByCode(code: string): Promise<CouponCode | null>;
  list(filters: CouponListFilters): Promise<CouponListResult>;
  getRedemptionsByViewer(couponId: string, viewerId: string): Promise<CouponRedemption[]>;
  getRedemptionsByPurchase(purchaseId: string): Promise<CouponRedemption | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface ICouponWriter {
  create(data: CreateCouponData): Promise<CouponCode>;
  update(id: string, data: UpdateCouponData): Promise<CouponCode>;
  incrementUsedCount(id: string): Promise<void>;
  createRedemption(data: CreateRedemptionData): Promise<CouponRedemption>;
}
