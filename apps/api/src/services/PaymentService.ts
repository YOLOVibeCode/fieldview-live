/**
 * Payment Service Implementation
 * 
 * Implements IPaymentReader and IPaymentWriter.
 * Handles Square Checkout integration with Apple Pay, Google Pay support.
 * 
 * Note: Frontend will use Square Web Payments SDK for one-click Apple Pay/Google Pay.
 */

import crypto from 'crypto';

import type { Purchase } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { getEmailProvider } from '../lib/email';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import type { IEntitlementReader, IEntitlementWriter } from '../repositories/IEntitlementRepository';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';
import type { IWatchLinkReaderRepo } from '../repositories/IWatchLinkRepository';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';

import type { IPaymentReader, IPaymentWriter, CheckoutResponse, SquareWebhookEvent } from './IPaymentService';
import { LedgerService } from './LedgerService';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { ReceiptService } from './ReceiptService';

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

    // Determine recipient based on account type
    const ownerAccount = await prisma.ownerAccount.findUnique({
      where: { id: game.ownerAccountId },
    });
    if (!ownerAccount) {
      throw new NotFoundError('Owner account not found');
    }

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

    // Create purchase record with recipient fields
    const purchase = await this.purchaseWriter.create({
      gameId: game.id,
      viewerId: viewer.id,
      amountCents: game.priceCents,
      currency: game.currency || 'USD',
      platformFeeCents: split.platformFeeCents,
      processorFeeCents: split.processorFeeCents,
      ownerNetCents: split.ownerNetCents,
      status: 'created',
      recipientOwnerAccountId,
      recipientType,
      recipientOrganizationId,
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

      // Extract actual processing fees from Square payment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processingFeeMoney = (payment as any).processingFeeMoney;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actualProcessorFeeCents = processingFeeMoney?.amount 
        ? Number(processingFeeMoney.amount) 
        : undefined;

      // Update purchase status based on Square payment status
      if (payment.status === 'COMPLETED') {
        const wasPaid = purchase.status === 'paid';
        // Recalculate owner net with actual processor fee if available
        const processorFeeCents = actualProcessorFeeCents ?? purchase.processorFeeCents;
        const ownerNetCents = purchase.amountCents - purchase.platformFeeCents - processorFeeCents;

        const updatedPurchase = await this.purchaseWriter.update(purchase.id, {
          status: 'paid',
          paidAt: new Date(),
          paymentProviderCustomerId: payment.customer_id,
          processorFeeCents: processorFeeCents,
          ownerNetCents: ownerNetCents,
        });

        // Create ledger entries (idempotent: check if entries already exist)
        try {
          const ledgerRepo = new LedgerRepository(prisma);
          const existingEntries = await ledgerRepo.findByReference('purchase', purchase.id);
          if (existingEntries.length === 0) {
            const split = {
              grossAmountCents: purchase.amountCents,
              platformFeeCents: purchase.platformFeeCents,
              processorFeeCents: processorFeeCents,
              ownerNetCents: ownerNetCents,
            };
            await this.ledgerService.createPurchaseLedgerEntries(
              updatedPurchase,
              split,
              actualProcessorFeeCents
            );
          }
        } catch (ledgerError) {
          // Don't fail webhook if ledger creation fails (log and continue)
          logger.error({ ledgerError, purchaseId: purchase.id }, 'Failed to create ledger entries from webhook');
        }

        // Create entitlement if not already exists
        const existingEntitlement = await this.entitlementReader.getByPurchaseId(purchase.id);
        let entitlementToken: string | null = existingEntitlement?.tokenId ?? null;
        if (!existingEntitlement) {
          // Generate token ID (hash of purchase ID + timestamp)
          const tokenId = crypto.createHash('sha256')
            .update(`${purchase.id}-${Date.now()}`)
            .digest('hex');

          // Get game to determine entitlement validity period
          const game = purchase.gameId ? await this.gameReader.getById(purchase.gameId) : null;
          const validFrom = new Date();
          const validTo = game?.endsAt || new Date(validFrom.getTime() + 24 * 60 * 60 * 1000); // Default 24 hours or game end time

          await this.entitlementWriter.create({
            purchaseId: purchase.id,
            tokenId,
            validFrom,
            validTo,
            status: 'active',
          });
          entitlementToken = tokenId;
        }

        // Send receipt email once (best-effort)
        if (!wasPaid) {
          const viewer = await prisma.viewerIdentity.findUnique({
            where: { id: purchase.viewerId },
            select: { email: true },
          });
          if (viewer?.email) {
            await this.receiptService.sendPurchaseReceipt({
              to: viewer.email,
              purchaseId: purchase.id,
              amountCents: purchase.amountCents,
              currency: purchase.currency || 'USD',
              streamUrl: entitlementToken ? `${APP_URL}/stream/${entitlementToken}` : null,
            });
          }
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

      const isFullRefund = refundAmount >= purchaseAmount;
      const updatedPurchase = await this.purchaseWriter.update(purchase.id, {
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        refundedAt: new Date(),
      });

      // Create ledger entries for refund (idempotent)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refundId = (refund as any).id || `refund-${purchase.id}-${Date.now()}`;
        const ledgerRepo = new LedgerRepository(prisma);
        const existingRefundEntries = await ledgerRepo.findByReference('refund', refundId);
        
        if (existingRefundEntries.length === 0) {
          await this.ledgerService.createRefundLedgerEntries(
            updatedPurchase,
            refundAmount,
            refundId
          );
        }
      } catch (ledgerError) {
        // Don't fail webhook if ledger creation fails (log and continue)
        logger.error({ ledgerError, purchaseId: purchase.id }, 'Failed to create refund ledger entries from webhook');
      }
    }
  }
}
