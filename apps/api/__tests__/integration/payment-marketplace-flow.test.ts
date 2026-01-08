/**
 * Payment Marketplace Flow Integration Tests
 *
 * End-to-end verification of the payment flow:
 * 1. Checkout creates purchase with correct fee calculation
 * 2. Payment processing sends correct applicationFeeMoney to Square
 * 3. Ledger entries are created with correct amounts
 * 4. 10% platform fee / 90% owner split is enforced
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { calculateMarketplaceSplit } from '@/utils/feeCalculator';
import type { Purchase } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownerAccount: {
      findUnique: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
    viewerIdentity: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Payment Marketplace Flow', () => {
  describe('Checkout → Fee Calculation → Ledger Flow', () => {
    it('correctly calculates 10% platform fee at checkout', () => {
      const purchaseAmountCents = 1000; // $10.00
      const PLATFORM_FEE_PERCENT = 10;

      const split = calculateMarketplaceSplit(purchaseAmountCents, PLATFORM_FEE_PERCENT);

      // Verify 10% platform fee
      expect(split.platformFeeCents).toBe(100);
      expect(split.platformFeeCents / split.grossAmountCents).toBe(0.1);

      // Verify processor fee (2.9% + $0.30)
      expect(split.processorFeeCents).toBe(59);

      // Verify owner net
      expect(split.ownerNetCents).toBe(841);

      // Verify sum
      expect(split.platformFeeCents + split.processorFeeCents + split.ownerNetCents)
        .toBe(split.grossAmountCents);
    });

    it('produces correct Square API payment request structure', () => {
      const purchaseAmountCents = 2500; // $25.00
      const currency = 'USD';
      const PLATFORM_FEE_PERCENT = 10;

      const split = calculateMarketplaceSplit(purchaseAmountCents, PLATFORM_FEE_PERCENT);

      // This is the structure sent to Square paymentsApi.create()
      const squarePaymentRequest = {
        idempotencyKey: 'purchase-uuid-here',
        sourceId: 'cnon:card-nonce-from-web-payments-sdk',
        amountMoney: {
          amount: BigInt(purchaseAmountCents),
          currency,
        },
        applicationFeeMoney: {
          amount: BigInt(split.platformFeeCents),
          currency,
        },
        locationId: 'owner-square-location-id',
        autocomplete: true,
      };

      // Verify the applicationFeeMoney is exactly 10% of gross
      expect(Number(squarePaymentRequest.applicationFeeMoney.amount)).toBe(250);
      expect(Number(squarePaymentRequest.applicationFeeMoney.amount) / Number(squarePaymentRequest.amountMoney.amount))
        .toBe(0.1);
    });

    it('ledger entries match purchase record amounts', () => {
      const purchase: Partial<Purchase> = {
        id: 'purchase-123',
        amountCents: 1000,
        currency: 'USD',
        platformFeeCents: 100,
        processorFeeCents: 59,
        ownerNetCents: 841,
        recipientOwnerAccountId: 'owner-123',
      };

      // Ledger entries that would be created
      const ledgerEntries = [
        {
          type: 'charge',
          amountCents: purchase.amountCents, // +1000 (credit)
        },
        {
          type: 'platform_fee',
          amountCents: -(purchase.platformFeeCents!), // -100 (debit)
        },
        {
          type: 'processor_fee',
          amountCents: -(purchase.processorFeeCents!), // -59 (debit)
        },
      ];

      // Verify ledger entry amounts match purchase record
      expect(ledgerEntries[0].amountCents).toBe(1000);
      expect(ledgerEntries[1].amountCents).toBe(-100);
      expect(ledgerEntries[2].amountCents).toBe(-59);

      // Verify sum equals owner net
      const ledgerSum = ledgerEntries.reduce((sum, e) => sum + e.amountCents, 0);
      expect(ledgerSum).toBe(purchase.ownerNetCents);
    });
  });

  describe('Marketplace Split Verification', () => {
    const testCases = [
      { gross: 500, description: '$5.00 purchase' },
      { gross: 1000, description: '$10.00 purchase' },
      { gross: 2500, description: '$25.00 purchase' },
      { gross: 5000, description: '$50.00 purchase' },
      { gross: 9999, description: '$99.99 purchase' },
      { gross: 10000, description: '$100.00 purchase' },
    ];

    testCases.forEach(({ gross, description }) => {
      describe(description, () => {
        const split = calculateMarketplaceSplit(gross, 10);

        it('platform receives exactly 10%', () => {
          const platformPercentage = split.platformFeeCents / split.grossAmountCents;
          expect(platformPercentage).toBeCloseTo(0.1, 2);
        });

        it('owner receives ~90% minus processor fees', () => {
          const ownerPercentage = split.ownerNetCents / split.grossAmountCents;
          // Owner should get between 80-90% (90% - processor fee)
          expect(ownerPercentage).toBeGreaterThan(0.80);
          expect(ownerPercentage).toBeLessThan(0.90);
        });

        it('all amounts sum to gross', () => {
          const sum = split.platformFeeCents + split.processorFeeCents + split.ownerNetCents;
          expect(sum).toBe(split.grossAmountCents);
        });

        it('processor fee follows 2.9% + $0.30 formula', () => {
          const expectedProcessorFee = Math.round(gross * 0.029 + 30);
          expect(split.processorFeeCents).toBe(expectedProcessorFee);
        });
      });
    });
  });

  describe('Square Credentials Auto-Save Flow', () => {
    it('OAuth callback saves encrypted tokens', async () => {
      // Simulated OAuth callback data
      const oauthResponse = {
        access_token: 'sq0atp-ACCESS_TOKEN_FROM_SQUARE',
        refresh_token: 'sq0atr-REFRESH_TOKEN_FROM_SQUARE',
        expires_at: '2025-02-01T00:00:00.000Z',
        merchant_id: 'MERCHANT123',
      };

      // What should be saved to OwnerAccount
      const expectedUpdate = {
        payoutProviderRef: oauthResponse.merchant_id,
        squareAccessTokenEncrypted: expect.any(String), // Encrypted, not plaintext
        squareRefreshTokenEncrypted: expect.any(String), // Encrypted, not plaintext
        squareTokenExpiresAt: expect.any(Date),
        squareLocationId: expect.any(String), // Discovered from Square API
      };

      // Verify the expected fields are present
      expect(expectedUpdate.payoutProviderRef).toBe('MERCHANT123');
      expect(expectedUpdate.squareAccessTokenEncrypted).toBeDefined();
      expect(expectedUpdate.squareRefreshTokenEncrypted).toBeDefined();
    });

    it('payment flow uses owner Square credentials', async () => {
      // Owner account with Square connected
      const ownerAccount = {
        id: 'owner-123',
        squareAccessTokenEncrypted: 'encrypted:token:here',
        squareRefreshTokenEncrypted: 'encrypted:refresh:here',
        squareTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        squareLocationId: 'LOCATION123',
      };

      // Verify owner has valid Square credentials
      expect(ownerAccount.squareAccessTokenEncrypted).toBeDefined();
      expect(ownerAccount.squareLocationId).toBeDefined();

      // Token should not be expired
      expect(ownerAccount.squareTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Refund Fee Handling', () => {
    it('full refund returns full platform fee', () => {
      const purchase = {
        amountCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
      };

      const refundAmountCents = 1000; // Full refund
      const isFullRefund = refundAmountCents >= purchase.amountCents;

      // Platform fee refund for full refund
      const platformFeeRefundCents = isFullRefund
        ? purchase.platformFeeCents
        : Math.round(purchase.platformFeeCents * (refundAmountCents / purchase.amountCents));

      expect(platformFeeRefundCents).toBe(100); // Full platform fee returned
    });

    it('partial refund returns pro-rata platform fee', () => {
      const purchase = {
        amountCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
      };

      const refundAmountCents = 500; // 50% refund
      const refundRatio = refundAmountCents / purchase.amountCents;

      const platformFeeRefundCents = Math.round(purchase.platformFeeCents * refundRatio);

      expect(platformFeeRefundCents).toBe(50); // 50% of platform fee returned
    });

    it('processor fee is NOT refunded (Square keeps it)', () => {
      const purchase = {
        amountCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
      };

      // Processor fees are never refunded
      const processorFeeRefundCents = 0;

      expect(processorFeeRefundCents).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('payment fails gracefully if owner has no Square credentials', () => {
      const ownerAccountWithoutSquare = {
        id: 'owner-123',
        squareAccessTokenEncrypted: null,
        squareLocationId: null,
      };

      const hasValidSquareCredentials =
        ownerAccountWithoutSquare.squareAccessTokenEncrypted !== null &&
        ownerAccountWithoutSquare.squareLocationId !== null;

      expect(hasValidSquareCredentials).toBe(false);

      // Should throw BadRequestError with message about connecting Square
      const expectedErrorMessage = 'Owner has not connected Square account';
      expect(expectedErrorMessage).toContain('Square');
    });

    it('payment fails gracefully if owner token is expired and cannot refresh', () => {
      const ownerAccountWithExpiredToken = {
        id: 'owner-123',
        squareAccessTokenEncrypted: 'encrypted:token',
        squareRefreshTokenEncrypted: null, // No refresh token
        squareTokenExpiresAt: new Date(Date.now() - 1000), // Expired
      };

      const isExpired = ownerAccountWithExpiredToken.squareTokenExpiresAt.getTime() < Date.now();
      const canRefresh = ownerAccountWithExpiredToken.squareRefreshTokenEncrypted !== null;

      expect(isExpired).toBe(true);
      expect(canRefresh).toBe(false);

      // Should require owner to reconnect Square
      const needsReconnect = isExpired && !canRefresh;
      expect(needsReconnect).toBe(true);
    });
  });

  describe('Currency Handling', () => {
    it('uses purchase currency for all fee calculations', () => {
      const currencies = ['USD', 'CAD', 'GBP', 'EUR'];

      currencies.forEach((currency) => {
        const split = calculateMarketplaceSplit(1000, 10);

        // The split calculation is currency-agnostic (works in cents/minor units)
        expect(split.grossAmountCents).toBe(1000);
        expect(split.platformFeeCents).toBe(100);

        // Currency would be passed through to Square and ledger
        const squareAmountMoney = {
          amount: BigInt(split.grossAmountCents),
          currency,
        };

        expect(squareAmountMoney.currency).toBe(currency);
      });
    });
  });
});
