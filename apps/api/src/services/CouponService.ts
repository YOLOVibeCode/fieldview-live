/**
 * Coupon Service
 *
 * Business logic for coupon validation and redemption.
 */

import type { CouponCode } from '@prisma/client';
import type { ICouponReader, ICouponWriter } from '../repositories/ICouponRepository';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponCode;
  discountCents?: number;
  discountType?: 'percentage' | 'fixed_cents';
  discountValue?: number;
  error?: string;
}

export interface CouponValidationContext {
  code: string;
  gameId?: string | null;
  ownerAccountId?: string | null;
  viewerId: string;
  amountCents: number;
}

export class CouponService {
  constructor(
    private couponReader: ICouponReader,
    private couponWriter: ICouponWriter
  ) {}

  /**
   * Validate a coupon code for a specific context.
   * Returns the discount amount if valid, or an error message if invalid.
   */
  async validateCoupon(context: CouponValidationContext): Promise<CouponValidationResult> {
    const coupon = await this.couponReader.getByCode(context.code);

    if (!coupon) {
      return { valid: false, error: 'Coupon code not found' };
    }

    // Check status
    if (coupon.status !== 'active') {
      return { valid: false, error: 'This coupon code is no longer active' };
    }

    // Check date range
    const now = new Date();
    if (coupon.validFrom > now) {
      return { valid: false, error: 'This coupon is not yet valid' };
    }
    if (coupon.validTo && coupon.validTo < now) {
      return { valid: false, error: 'This coupon has expired' };
    }

    // Check max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'This coupon has reached its usage limit' };
    }

    // Check max uses per viewer
    const viewerRedemptions = await this.couponReader.getRedemptionsByViewer(
      coupon.id,
      context.viewerId
    );
    if (viewerRedemptions.length >= coupon.maxUsesPerViewer) {
      return { valid: false, error: 'You have already used this coupon' };
    }

    // Check game scope
    if (coupon.gameId !== null && coupon.gameId !== context.gameId) {
      return { valid: false, error: 'This coupon is not valid for this game' };
    }

    // Check owner scope
    if (coupon.ownerAccountId !== null && coupon.ownerAccountId !== context.ownerAccountId) {
      return { valid: false, error: 'This coupon is not valid for this seller' };
    }

    // Check minimum purchase
    if (coupon.minPurchaseCents !== null && context.amountCents < coupon.minPurchaseCents) {
      const minDollars = (coupon.minPurchaseCents / 100).toFixed(2);
      return {
        valid: false,
        error: `This coupon requires a minimum purchase of $${minDollars}`,
      };
    }

    // Calculate discount
    const discountCents = this.calculateDiscount(coupon, context.amountCents);

    return {
      valid: true,
      coupon,
      discountCents,
      discountType: coupon.discountType as 'percentage' | 'fixed_cents',
      discountValue: coupon.discountValue,
    };
  }

  /**
   * Calculate the discount amount for a coupon.
   */
  calculateDiscount(coupon: CouponCode, amountCents: number): number {
    if (coupon.discountType === 'percentage') {
      // Calculate percentage discount, capped at purchase amount
      const discount = Math.floor((amountCents * coupon.discountValue) / 100);
      return Math.min(discount, amountCents);
    } else {
      // Fixed cents discount, capped at purchase amount
      return Math.min(coupon.discountValue, amountCents);
    }
  }

  /**
   * Apply a coupon to a purchase after payment succeeds.
   * This increments the usage count and creates a redemption record.
   */
  async applyCoupon(
    couponId: string,
    purchaseId: string,
    viewerId: string,
    discountCents: number
  ): Promise<void> {
    // Increment usage count
    await this.couponWriter.incrementUsedCount(couponId);

    // Create redemption record
    await this.couponWriter.createRedemption({
      couponId,
      purchaseId,
      viewerId,
      discountCents,
    });
  }

  /**
   * Get coupon by code (for admin lookup).
   */
  async getByCode(code: string): Promise<CouponCode | null> {
    return this.couponReader.getByCode(code);
  }

  /**
   * Get coupon by ID.
   */
  async getById(id: string): Promise<CouponCode | null> {
    return this.couponReader.getById(id);
  }
}
