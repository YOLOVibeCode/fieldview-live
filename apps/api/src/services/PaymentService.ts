/**
 * Payment Service Implementation
 * 
 * Implements IPaymentReader and IPaymentWriter.
 * Handles Square Checkout integration with Apple Pay, Google Pay support.
 * 
 * Note: Frontend will use Square Web Payments SDK for one-click Apple Pay/Google Pay.
 */

import type { Purchase } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { getEmailProvider } from '../lib/email';
import { getOwnerPaymentsReadiness } from '../lib/payments-readiness';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import type { IEntitlementReader, IEntitlementWriter } from '../repositories/IEntitlementRepository';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';
import type { IWatchLinkReaderRepo } from '../repositories/IWatchLinkRepository';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';

import type { IPaymentReader, IPaymentWriter, CheckoutResponse } from './IPaymentService';
import { LedgerService } from './LedgerService';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { ReceiptService } from './ReceiptService';
import type { CouponService } from './CouponService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');

export class PaymentService implements IPaymentReader, IPaymentWriter {
  private ledgerService: LedgerService;
  private receiptService: ReceiptService;

  constructor(
    private gameReader: IGameReader,
    private viewerIdentityReader: IViewerIdentityReader,
    private viewerIdentityWriter: IViewerIdentityWriter,
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
    private entitlementReader: IEntitlementReader,
    private entitlementWriter: IEntitlementWriter,
    private watchLinkReader: IWatchLinkReaderRepo
  ) {
    const ledgerRepo = new LedgerRepository(prisma);
    const ownerAccountRepo = new OwnerAccountRepository(prisma);
    this.ledgerService = new LedgerService(ledgerRepo, ownerAccountRepo);
    this.receiptService = new ReceiptService(getEmailProvider(), APP_URL);
  }

  async getPurchaseById(id: string): Promise<Purchase | null> {
    return this.purchaseReader.getById(id);
  }

  async createCheckout(
    gameId: string,
    viewerEmail: string,
    viewerPhone?: string,
    returnUrl?: string,
    couponCode?: string,
    couponService?: CouponService
  ): Promise<CheckoutResponse> {
    // Get game
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Check if game is available for purchase
    if (game.state !== 'active' && game.state !== 'live') {
      throw new NotFoundError('Game is not available for purchase');
    }

    // Find or create viewer identity
    let viewer = await this.viewerIdentityReader.getByEmail(viewerEmail);
    if (!viewer) {
      viewer = await this.viewerIdentityWriter.create({
        email: viewerEmail,
        phoneE164: viewerPhone,
      });
    } else if (viewerPhone && !viewer.phoneE164) {
      // Update phone if provided and not already set
      viewer = await this.viewerIdentityWriter.update(viewer.id, {
        phoneE164: viewerPhone,
      });
    }

    // Determine recipient based on account type
    const ownerAccount = await prisma.ownerAccount.findUnique({
      where: { id: game.ownerAccountId },
    });
    if (!ownerAccount) {
      throw new NotFoundError('Owner account not found');
    }

    // Apply coupon if provided
    let discountCents = 0;
    let couponCodeId: string | null = null;

    if (couponCode && couponService) {
      const couponResult = await couponService.validateCoupon({
        code: couponCode,
        gameId: game.id,
        ownerAccountId: game.ownerAccountId,
        viewerId: viewer.id,
        amountCents: game.priceCents,
      });

      if (!couponResult.valid) {
        throw new BadRequestError(couponResult.error || 'Invalid coupon code');
      }

      discountCents = couponResult.discountCents || 0;
      couponCodeId = couponResult.coupon?.id || null;
    }

    // Calculate final amount after discount
    const finalAmountCents = Math.max(0, game.priceCents - discountCents);

    // Calculate marketplace split on the discounted amount
    const split = calculateMarketplaceSplit(finalAmountCents, PLATFORM_FEE_PERCENT);

    let recipientOwnerAccountId: string = ownerAccount.id;
    let recipientType: 'personal' | 'organization' | null = null;
    let recipientOrganizationId: string | null = null;

    if (ownerAccount.type === 'owner') {
      // Personal plan: payout goes to individual owner
      recipientType = 'personal';
    } else if (ownerAccount.type === 'association') {
      // Fundraising plan: payout goes to organization
      recipientType = 'organization';
      // Find organization for this owner account
      const organization = await prisma.organization.findFirst({
        where: { ownerAccountId: ownerAccount.id },
      });
      if (organization) {
        recipientOrganizationId = organization.id;
      }
    }

    // Create purchase record with recipient fields and coupon info
    const purchase = await this.purchaseWriter.create({
      gameId: game.id,
      viewerId: viewer.id,
      amountCents: finalAmountCents,
      currency: game.currency || 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
      recipientOwnerAccountId,
      recipientType,
      recipientOrganizationId,
      couponCodeId,
      discountCents,
    });

    // Apply coupon redemption after purchase is created
    if (couponCodeId && couponService && discountCents > 0) {
      await couponService.applyCoupon(couponCodeId, purchase.id, viewer.id, discountCents);
    }

    // Return checkout URL - Frontend will use Square Web Payments SDK
    // Square Web Payments SDK supports Apple Pay and Google Pay natively
    // This enables one-click checkout on mobile devices!
    const finalReturnUrl = returnUrl || `${APP_URL}/checkout/${purchase.id}/success`;
    const checkoutUrl = `${APP_URL}/checkout/${purchase.id}/payment?returnUrl=${encodeURIComponent(finalReturnUrl)}`;

    return {
      purchaseId: purchase.id,
      checkoutUrl,
    };
  }

  async createChannelCheckout(
    channelId: string,
    viewerEmail: string,
    viewerPhone?: string,
    returnUrl?: string
  ): Promise<CheckoutResponse> {
    // Get channel
    const channel = await this.watchLinkReader.getChannelById(channelId);
    if (!channel) {
      throw new NotFoundError('Channel not found');
    }

    // Check if channel requires payment
    if (channel.accessMode !== 'pay_per_view' || !channel.priceCents || channel.priceCents <= 0) {
      throw new BadRequestError('Channel does not require payment');
    }

    // Find or create viewer identity
    let viewer = await this.viewerIdentityReader.getByEmail(viewerEmail);
    if (!viewer) {
      viewer = await this.viewerIdentityWriter.create({
        email: viewerEmail,
        phoneE164: viewerPhone,
      });
    } else if (viewerPhone && !viewer.phoneE164) {
      viewer = await this.viewerIdentityWriter.update(viewer.id, {
        phoneE164: viewerPhone,
      });
    }

    // Calculate marketplace split
    const split = calculateMarketplaceSplit(channel.priceCents, PLATFORM_FEE_PERCENT);

    // Determine recipient based on organization owner account
    const organization = await this.watchLinkReader.getOrganizationById(channel.organizationId);
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    const ownerAccount = await prisma.ownerAccount.findUnique({
      where: { id: organization.ownerAccountId },
    });
    if (!ownerAccount) {
      throw new NotFoundError('Owner account not found');
    }

    let recipientOwnerAccountId: string = ownerAccount.id;
    let recipientType: 'personal' | 'organization' | null = null;
    let recipientOrganizationId: string | null = null;

    if (ownerAccount.type === 'owner') {
      recipientType = 'personal';
    } else if (ownerAccount.type === 'association') {
      recipientType = 'organization';
      recipientOrganizationId = organization.id;
    }

    // Create purchase record for channel
    const purchase = await this.purchaseWriter.create({
      channelId: channel.id,
      viewerId: viewer.id,
      amountCents: channel.priceCents,
      currency: channel.currency || 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
      recipientOwnerAccountId,
      recipientType,
      recipientOrganizationId,
    });

    const finalReturnUrl = returnUrl || `${APP_URL}/checkout/${purchase.id}/success`;
    const checkoutUrl = `${APP_URL}/checkout/${purchase.id}/payment?returnUrl=${encodeURIComponent(finalReturnUrl)}`;

    return {
      purchaseId: purchase.id,
      checkoutUrl,
    };
  }

  async createDirectStreamCheckout(
    directStreamSlug: string,
    viewerEmail: string,
    viewerFirstName: string,
    viewerLastName: string,
    viewerPhone?: string,
    returnUrl?: string
  ): Promise<CheckoutResponse> {
    // Get DirectStream
    const stream = await prisma.directStream.findUnique({
      where: { slug: directStreamSlug },
      include: { ownerAccount: true },
    });

    if (!stream) {
      throw new NotFoundError('DirectStream not found');
    }

    // Check if paywall is enabled
    if (!stream.paywallEnabled || stream.priceInCents <= 0) {
      throw new BadRequestError('Paywall not enabled for this stream');
    }

    // Verify owner has Square credentials
    const ownerAccount = stream.ownerAccount;
    if (!ownerAccount) {
      throw new NotFoundError('Owner account not found');
    }

    const readiness = getOwnerPaymentsReadiness(ownerAccount);
    if (!readiness.ready) {
      const detail = readiness.reason ? ` ${readiness.reason}` : '';
      throw new BadRequestError(
        `Connect payments at /owners/payments before accepting payments.${detail}`.trim(),
      );
    }

    // Find or create viewer identity
    let viewer = await this.viewerIdentityReader.getByEmail(viewerEmail);
    if (!viewer) {
      viewer = await this.viewerIdentityWriter.create({
        email: viewerEmail,
        firstName: viewerFirstName,
        lastName: viewerLastName,
        phoneE164: viewerPhone,
      });
    } else {
      // Update names if they were not set before
      const updates: { firstName?: string; lastName?: string; phoneE164?: string } = {};
      if (!viewer.firstName) updates.firstName = viewerFirstName;
      if (!viewer.lastName) updates.lastName = viewerLastName;
      if (viewerPhone && !viewer.phoneE164) updates.phoneE164 = viewerPhone;
      
      if (Object.keys(updates).length > 0) {
        viewer = await this.viewerIdentityWriter.update(viewer.id, updates);
      }
    }

    // Calculate marketplace split
    const split = calculateMarketplaceSplit(stream.priceInCents, PLATFORM_FEE_PERCENT);

    // Determine recipient based on account type (same logic as Game/Channel)
    let recipientOwnerAccountId: string = ownerAccount.id;
    let recipientType: 'personal' | 'organization' | null = null;
    let recipientOrganizationId: string | null = null;

    if (ownerAccount.type === 'owner') {
      // Personal plan: payout goes to individual owner
      recipientType = 'personal';
    } else if (ownerAccount.type === 'association') {
      // Fundraising plan: payout goes to organization
      recipientType = 'organization';
      // Find organization for this owner account
      const organization = await prisma.organization.findFirst({
        where: { ownerAccountId: ownerAccount.id },
      });
      if (organization) {
        recipientOrganizationId = organization.id;
      }
    }

    // Create purchase record for DirectStream paywall
    const purchase = await this.purchaseWriter.create({
      directStreamId: stream.id,  // 🆕 Link to DirectStream
      viewerId: viewer.id,
      amountCents: stream.priceInCents,
      currency: 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
      recipientOwnerAccountId,
      recipientType,
      recipientOrganizationId,
    });

    logger.info({
      purchaseId: purchase.id,
      directStreamSlug,
      viewerEmail,
      amountCents: stream.priceInCents,
      recipientType,
    }, 'DirectStream paywall checkout created');

    const finalReturnUrl = returnUrl || `${APP_URL}/direct/${directStreamSlug}?payment=success`;
    const checkoutUrl = `${APP_URL}/checkout/${purchase.id}/payment?returnUrl=${encodeURIComponent(finalReturnUrl)}`;

    return {
      purchaseId: purchase.id,
      checkoutUrl,
    };
  }
}
