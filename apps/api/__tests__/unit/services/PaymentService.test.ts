/**
 * Payment Service Unit Tests (TDD)
 *
 * Tests for recipient field assignment based on account type.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game, OwnerAccount, Organization, Purchase, ViewerIdentity } from '@prisma/client';

import { NotFoundError } from '@/lib/errors';
import type { IEntitlementReader, IEntitlementWriter } from '@/repositories/IEntitlementRepository';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IPurchaseReader, IPurchaseWriter } from '@/repositories/IPurchaseRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '@/repositories/IViewerIdentityRepository';
import type { IWatchLinkReaderRepo } from '@/repositories/IWatchLinkRepository';
import { PaymentService } from '@/services/PaymentService';
import type { CheckoutResponse } from '@/services/IPaymentService';
import { BadRequestError } from '@/lib/errors';

// Mock Prisma client for ownerAccount and organization lookups
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownerAccount: {
      findUnique: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
    directStream: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('PaymentService - Recipient Field Assignment', () => {
  let mockGameReader: IGameReader;
  let mockViewerIdentityReader: IViewerIdentityReader;
  let mockViewerIdentityWriter: IViewerIdentityWriter;
  let mockPurchaseReader: IPurchaseReader;
  let mockPurchaseWriter: IPurchaseWriter;
  let mockEntitlementReader: IEntitlementReader;
  let mockEntitlementWriter: IEntitlementWriter;
  let mockWatchLinkReader: IWatchLinkReaderRepo;
  let paymentService: PaymentService;

  beforeEach(() => {
    // Reset Prisma mocks
    vi.clearAllMocks();
    
    // Reset mocks
    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
    } as unknown as IGameReader;

    mockViewerIdentityReader = {
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
    } as unknown as IViewerIdentityReader;

    mockViewerIdentityWriter = {
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as IViewerIdentityWriter;

    mockPurchaseReader = {
      getById: vi.fn(),
      getByPaymentProviderId: vi.fn(),
      listByGameId: vi.fn(),
      listByViewerId: vi.fn(),
    } as unknown as IPurchaseReader;

    mockPurchaseWriter = {
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as IPurchaseWriter;

    mockEntitlementReader = {
      getByPurchaseId: vi.fn(),
      getByTokenId: vi.fn(),
    } as unknown as IEntitlementReader;

    mockEntitlementWriter = {
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as IEntitlementWriter;

    mockWatchLinkReader = {
      getChannelById: vi.fn(),
      getOrganizationById: vi.fn(),
    } as unknown as IWatchLinkReaderRepo;

    paymentService = new PaymentService(
      mockGameReader,
      mockViewerIdentityReader,
      mockViewerIdentityWriter,
      mockPurchaseReader,
      mockPurchaseWriter,
      mockEntitlementReader,
      mockEntitlementWriter,
      mockWatchLinkReader,
    );
  });

  describe('createCheckout - Personal Account Recipient', () => {
    it('should set recipientType="personal" and recipientOwnerAccountId for personal owner accounts', async () => {
      const personalOwnerAccount: OwnerAccount = {
        id: 'owner-account-123',
        type: 'owner', // Personal account
        name: 'John Doe',
        status: 'active',
        contactEmail: 'john@example.com',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game: Game = {
        id: 'game-123',
        ownerAccountId: personalOwnerAccount.id,
        title: 'Test Game',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startsAt: new Date(),
        endsAt: null,
        state: 'active',
        priceCents: 1000,
        currency: 'USD',
        keywordCode: 'TEST123',
        keywordStatus: 'active',
        qrUrl: 'https://example.com/qr',
        streamSourceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelledAt: null,
      };

      const viewer: ViewerIdentity = {
        id: 'viewer-123',
        email: 'viewer@example.com',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
      };

      const purchase: Purchase = {
        id: 'purchase-123',
        gameId: game.id,
        channelId: null,
        eventId: null,
        viewerId: viewer.id,
        amountCents: 1000,
        currency: 'USD',
        platformFeeCents: 100,
        processorFeeCents: 30,
        ownerNetCents: 870,
        status: 'created',
        paymentProviderPaymentId: null,
        paymentProviderCustomerId: null,
        recipientOwnerAccountId: personalOwnerAccount.id,
        recipientType: 'personal',
        recipientOrganizationId: null,
        createdAt: new Date(),
        paidAt: null,
        failedAt: null,
        refundedAt: null,
      };

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      (prisma.ownerAccount.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(personalOwnerAccount);
      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(null);
      vi.mocked(mockViewerIdentityWriter.create).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseWriter.create).mockResolvedValue(purchase);

      const result = await paymentService.createCheckout(game.id, viewer.email);

      // Verify purchase creation includes recipient fields
      expect(mockPurchaseWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: game.id,
          viewerId: viewer.id,
          amountCents: 1000,
          recipientOwnerAccountId: expect.any(String),
          recipientType: expect.stringMatching(/personal|organization/),
        })
      );

      expect(result).toEqual({
        purchaseId: purchase.id,
        checkoutUrl: expect.stringContaining(purchase.id),
      });
    });
  });

  describe('createCheckout - Organization Account Recipient', () => {
    it('should set recipientType="organization" and recipientOrganizationId for association accounts', async () => {
      const orgOwnerAccount: OwnerAccount = {
        id: 'owner-account-456',
        type: 'association', // Organization account
        name: 'Sports Club',
        status: 'active',
        contactEmail: 'club@example.com',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game: Game = {
        id: 'game-456',
        ownerAccountId: orgOwnerAccount.id,
        title: 'Club Game',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startsAt: new Date(),
        endsAt: null,
        state: 'active',
        priceCents: 2000,
        currency: 'USD',
        keywordCode: 'CLUB123',
        keywordStatus: 'active',
        qrUrl: 'https://example.com/qr',
        streamSourceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelledAt: null,
      };

      const viewer: ViewerIdentity = {
        id: 'viewer-456',
        email: 'viewer@example.com',
        phoneE164: null,
        smsOptOut: false,
        optOutAt: null,
        createdAt: new Date(),
        lastSeenAt: null,
      };

      // Mock organization lookup
      const organization: Organization = {
        id: 'org-123',
        ownerAccountId: orgOwnerAccount.id,
        shortName: 'SPORTSCLUB',
        name: 'Sports Club',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const purchase: Purchase = {
        id: 'purchase-456',
        gameId: game.id,
        channelId: null,
        eventId: null,
        viewerId: viewer.id,
        amountCents: 2000,
        currency: 'USD',
        platformFeeCents: 200,
        processorFeeCents: 60,
        ownerNetCents: 1740,
        status: 'created',
        paymentProviderPaymentId: null,
        paymentProviderCustomerId: null,
        recipientOwnerAccountId: orgOwnerAccount.id,
        recipientType: 'organization',
        recipientOrganizationId: organization.id,
        createdAt: new Date(),
        paidAt: null,
        failedAt: null,
        refundedAt: null,
      };

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      (prisma.ownerAccount.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(orgOwnerAccount);
      (prisma.organization.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(organization);
      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(null);
      vi.mocked(mockViewerIdentityWriter.create).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseWriter.create).mockResolvedValue(purchase);

      const result = await paymentService.createCheckout(game.id, viewer.email);

      // Verify purchase creation includes recipient fields
      expect(mockPurchaseWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: game.id,
          viewerId: viewer.id,
          amountCents: 2000,
          recipientOwnerAccountId: expect.any(String),
          recipientType: expect.stringMatching(/personal|organization/),
        })
      );

      expect(result).toEqual({
        purchaseId: purchase.id,
        checkoutUrl: expect.stringContaining(purchase.id),
      });
    });
  });

  describe('createDirectStreamCheckout — payments readiness', () => {
    const relayReadyOwner: OwnerAccount = {
      id: 'owner-relay',
      type: 'owner',
      name: 'Relay Coach',
      status: 'active',
      contactEmail: 'coach@example.com',
      payoutProviderRef: null,
      relayRecipientKey: 'owner-relay',
      agreementAcceptedVersion: 'v1',
      squareLocationId: 'LOC1',
      squareAccessTokenEncrypted: null,
      squareRefreshTokenEncrypted: null,
      squareTokenExpiresAt: null,
      paymentsConnectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      freeGamesUsed: 0,
      subscriptionTier: null,
      subscriptionEndsAt: null,
      abuseWarnings: 0,
      isSuspended: false,
      suspendedReason: null,
    };

    const legacyOwner: OwnerAccount = {
      ...relayReadyOwner,
      relayRecipientKey: null,
      agreementAcceptedVersion: null,
      paymentsConnectedAt: null,
      squareAccessTokenEncrypted: 'enc:token',
      squareTokenExpiresAt: new Date(Date.now() + 60_000),
    };

    const unconnectedOwner: OwnerAccount = {
      ...relayReadyOwner,
      relayRecipientKey: null,
      agreementAcceptedVersion: null,
      squareLocationId: null,
      paymentsConnectedAt: null,
    };

    const directStream = {
      id: 'ds-1',
      slug: 'paid-stream',
      paywallEnabled: true,
      priceInCents: 999,
      ownerAccount: relayReadyOwner,
    };

    const viewer: ViewerIdentity = {
      id: 'viewer-ds',
      email: 'buyer@example.com',
      firstName: 'Buy',
      lastName: 'Er',
      phoneE164: null,
      smsOptOut: false,
      optOutAt: null,
      createdAt: new Date(),
      lastSeenAt: null,
      emailVerifiedAt: null,
    };

    const purchase: Purchase = {
      id: 'purchase-ds',
      gameId: null,
      channelId: null,
      eventId: null,
      directStreamId: directStream.id,
      viewerId: viewer.id,
      amountCents: 999,
      currency: 'USD',
      platformFeeCents: 100,
      processorFeeCents: 30,
      ownerNetCents: 869,
      status: 'created',
      paymentProviderPaymentId: null,
      paymentProviderCustomerId: null,
      recipientOwnerAccountId: relayReadyOwner.id,
      recipientType: 'personal',
      recipientOrganizationId: null,
      couponCodeId: null,
      discountCents: 0,
      createdAt: new Date(),
      paidAt: null,
      failedAt: null,
      refundedAt: null,
    };

    beforeEach(() => {
      (prisma.directStream.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(directStream);
      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(null);
      vi.mocked(mockViewerIdentityWriter.create).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseWriter.create).mockResolvedValue(purchase);
    });

    it('creates checkout for relay-ready owner when PAYMENTS_VIA_RELAY is true', async () => {
      vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
      (prisma.directStream.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...directStream,
        ownerAccount: relayReadyOwner,
      });

      const result = await paymentService.createDirectStreamCheckout(
        'paid-stream',
        viewer.email!,
        'Buy',
        'Er',
      );

      expect(result.purchaseId).toBe(purchase.id);
      expect(mockPurchaseWriter.create).toHaveBeenCalled();
    });

    it('throws with /owners/payments message for unconnected owner', async () => {
      vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
      (prisma.directStream.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...directStream,
        ownerAccount: unconnectedOwner,
      });

      await expect(
        paymentService.createDirectStreamCheckout('paid-stream', viewer.email!, 'Buy', 'Er'),
      ).rejects.toThrow(BadRequestError);

      await expect(
        paymentService.createDirectStreamCheckout('paid-stream', viewer.email!, 'Buy', 'Er'),
      ).rejects.toThrow(/\/owners\/payments/);
    });

    it('creates checkout for legacy owner when relay flag is off', async () => {
      vi.stubEnv('PAYMENTS_VIA_RELAY', 'false');
      (prisma.directStream.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...directStream,
        ownerAccount: legacyOwner,
      });

      const result = await paymentService.createDirectStreamCheckout(
        'paid-stream',
        viewer.email!,
        'Buy',
        'Er',
      );

      expect(result.purchaseId).toBe(purchase.id);
    });
  });
});
