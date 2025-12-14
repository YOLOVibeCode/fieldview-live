/**
 * Payment Service Implementation
 * 
 * Implements IPaymentReader and IPaymentWriter.
 * Handles Square Checkout integration with Apple Pay, Google Pay support.
 * 
 * Note: Frontend will use Square Web Payments SDK for one-click Apple Pay/Google Pay.
 */

import crypto from 'crypto';

import { NotFoundError } from '../lib/errors';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IEntitlementReader, IEntitlementWriter } from '../repositories/IEntitlementRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';
import type { IPaymentReader, IPaymentWriter, CheckoutResponse, SquareWebhookEvent } from './IPaymentService';
import type { Purchase } from '@prisma/client';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');

export class PaymentService implements IPaymentReader, IPaymentWriter {
  constructor(
    private gameReader: IGameReader,
    private viewerIdentityReader: IViewerIdentityReader,
    private viewerIdentityWriter: IViewerIdentityWriter,
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
    private entitlementReader: IEntitlementReader,
    private entitlementWriter: IEntitlementWriter
  ) {}

  async getPurchaseById(id: string): Promise<Purchase | null> {
    return this.purchaseReader.getById(id);
  }

  async createCheckout(
    gameId: string,
    viewerEmail: string,
    viewerPhone?: string,
    returnUrl?: string
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

    // Calculate marketplace split
    const split = calculateMarketplaceSplit(game.priceCents, PLATFORM_FEE_PERCENT);

    // Create purchase record
    const purchase = await this.purchaseWriter.create({
      gameId: game.id,
      viewerId: viewer.id,
      amountCents: game.priceCents,
      currency: game.currency || 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
    });

    // Return checkout URL - Frontend will use Square Web Payments SDK
    // Square Web Payments SDK supports Apple Pay and Google Pay natively
    // This enables one-click checkout on mobile devices! 🚀
    const finalReturnUrl = returnUrl || `${APP_URL}/checkout/${purchase.id}/success`;
    const checkoutUrl = `${APP_URL}/checkout/${purchase.id}?square_checkout=true&email=${encodeURIComponent(viewerEmail)}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;

    return {
      purchaseId: purchase.id,
      checkoutUrl,
    };
  }

  async processSquareWebhook(event: SquareWebhookEvent): Promise<void> {
    // Handle payment.created and payment.updated events
    if (event.type === 'payment.created' || event.type === 'payment.updated') {
      const payment = event.data.object?.payment;
      if (!payment?.id) {
        return;
      }

      // Find purchase by Square payment ID
      const purchase = await this.purchaseReader.getByPaymentProviderId(payment.id);
      if (!purchase) {
        // Purchase not found - might be from different system, ignore
        return;
      }

      // Update purchase status based on Square payment status
      if (payment.status === 'COMPLETED') {
        await this.purchaseWriter.update(purchase.id, {
          status: 'paid',
          paidAt: new Date(),
          paymentProviderCustomerId: payment.customer_id,
        });

        // Create entitlement if not already exists
        const existingEntitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
        if (!existingEntitlement) {
          // Generate token ID (hash of purchase ID + timestamp)
          const tokenId = crypto.createHash('sha256')
            .update(`${purchase.id}-${Date.now()}`)
            .digest('hex');

          // Get game to determine entitlement validity period
          const game = await this.gameReader.getById(purchase.gameId);
          const validFrom = new Date();
          const validTo = game?.endsAt || new Date(validFrom.getTime() + 24 * 60 * 60 * 1000); // Default 24 hours or game end time

          await this.entitlementWriter.create({
            purchaseId: purchase.id,
            tokenId,
            validFrom,
            validTo,
            status: 'active',
          });
        }
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        await this.purchaseWriter.update(purchase.id, {
          status: 'failed',
          failedAt: new Date(),
        });
      }
    }

    // Handle refund.created event
    if (event.type === 'refund.created') {
      const refund = event.data.object?.refund;
      if (!refund?.paymentId) {
        return;
      }

      const purchase = await this.purchaseReader.getByPaymentProviderId(refund.paymentId);
      if (!purchase) {
        return;
      }

      // Update purchase status to refunded or partially_refunded
      const refundAmount = refund.amountMoney?.amount ? Number(refund.amountMoney.amount) : 0;
      const purchaseAmount = purchase.amountCents;

      if (refundAmount >= purchaseAmount) {
        await this.purchaseWriter.update(purchase.id, {
          status: 'refunded',
          refundedAt: new Date(),
        });
      } else {
        await this.purchaseWriter.update(purchase.id, {
          status: 'partially_refunded',
          refundedAt: new Date(),
        });
      }
    }
  }
}
