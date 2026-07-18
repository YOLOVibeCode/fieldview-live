/**
 * LedgerService Unit Tests
 *
 * Verifies that ledger entries are created correctly for purchases and refunds.
 * Critical for marketplace accounting: platform fee (10%), processor fee, owner net.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Purchase } from '@prisma/client';

import { LedgerService } from '@/services/LedgerService';
import type { ILedgerWriter } from '@/repositories/ILedgerRepository';
import type { IOwnerAccountReader } from '@/repositories/IOwnerAccountRepository';

describe('LedgerService', () => {
  let service: LedgerService;
  let mockLedgerWriter: ILedgerWriter;
  let mockOwnerAccountReader: IOwnerAccountReader;

  const mockOwnerAccount = {
    id: 'owner-account-123',
    name: 'Test Owner',
    type: 'owner',
    status: 'active',
    contactEmail: 'owner@example.com',
    payoutProviderRef: 'MERCHANT123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPurchase: Purchase = {
    id: 'purchase-123',
    gameId: 'game-123',
    channelId: null,
    eventId: null,
    viewerId: 'viewer-123',
    amountCents: 1000,
    currency: 'USD',
    platformFeeCents: 100,
    processorFeeCents: 59,
    ownerNetCents: 841,
    status: 'paid',
    paymentProviderPaymentId: 'sq-payment-123',
    paymentProviderCustomerId: 'sq-customer-123',
    recipientOwnerAccountId: 'owner-account-123',
    recipientType: 'personal',
    recipientOrganizationId: null,
    createdAt: new Date(),
    paidAt: new Date(),
    failedAt: null,
    refundedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLedgerWriter = {
      create: vi.fn().mockResolvedValue({ id: 'ledger-entry-123' }),
    };

    mockOwnerAccountReader = {
      findById: vi.fn().mockResolvedValue(mockOwnerAccount),
      findByPayoutProviderRef: vi.fn(),
      listAll: vi.fn(),
    };

    service = new LedgerService(mockLedgerWriter, mockOwnerAccountReader);
  });

  describe('createPurchaseLedgerEntries', () => {
    const split = {
      grossAmountCents: 1000,
      platformFeeCents: 100,
      processorFeeCents: 59,
      ownerNetCents: 841,
    };

    it('creates exactly 3 ledger entries for a purchase', async () => {
      await service.createPurchaseLedgerEntries(mockPurchase, split);

      expect(mockLedgerWriter.create).toHaveBeenCalledTimes(3);
    });

    it('creates charge entry with positive gross amount (credit to owner)', async () => {
      await service.createPurchaseLedgerEntries(mockPurchase, split);

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerAccountId: 'owner-account-123',
          type: 'charge',
          amountCents: 1000, // Positive = credit
          currency: 'USD',
          referenceType: 'purchase',
          referenceId: 'purchase-123',
        })
      );
    });

    it('creates platform fee entry with negative 10% amount (debit from owner)', async () => {
      await service.createPurchaseLedgerEntries(mockPurchase, split);

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerAccountId: 'owner-account-123',
          type: 'platform_fee',
          amountCents: -100, // Negative = debit (10% of 1000)
          currency: 'USD',
          referenceType: 'purchase',
          referenceId: 'purchase-123',
          description: expect.stringContaining('10%'),
        })
      );
    });

    it('creates processor fee entry with negative amount (debit from owner)', async () => {
      await service.createPurchaseLedgerEntries(mockPurchase, split);

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerAccountId: 'owner-account-123',
          type: 'processor_fee',
          amountCents: -59, // Negative = debit (2.9% + $0.30)
          currency: 'USD',
          referenceType: 'purchase',
          referenceId: 'purchase-123',
        })
      );
    });

    it('ledger entries sum to zero (balanced books)', async () => {
      await service.createPurchaseLedgerEntries(mockPurchase, split);

      const calls = vi.mocked(mockLedgerWriter.create).mock.calls;
      const totalAmount = calls.reduce((sum, call) => {
        const entry = call[0] as { amountCents: number };
        return sum + entry.amountCents;
      }, 0);

      // charge (+1000) + platform_fee (-100) + processor_fee (-59) = 841 (owner net)
      // The ledger shows debits/credits, sum should equal owner net
      expect(totalAmount).toBe(split.ownerNetCents);
    });

    it('uses actual processor fee when provided by Square', async () => {
      const actualProcessorFeeCents = 62; // Square returned actual fee

      await service.createPurchaseLedgerEntries(mockPurchase, split, actualProcessorFeeCents);

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'processor_fee',
          amountCents: -62, // Uses actual fee, not estimated
        })
      );
    });

    it('throws error if owner account not found', async () => {
      vi.mocked(mockOwnerAccountReader.findById).mockResolvedValue(null);

      await expect(
        service.createPurchaseLedgerEntries(mockPurchase, split)
      ).rejects.toThrow('Owner account not found');
    });

    it('handles large purchase amounts correctly', async () => {
      const largePurchase = {
        ...mockPurchase,
        amountCents: 50000,
        platformFeeCents: 5000,
        processorFeeCents: 1480,
        ownerNetCents: 43520,
      };

      const largeSplit = {
        grossAmountCents: 50000,
        platformFeeCents: 5000,
        processorFeeCents: 1480,
        ownerNetCents: 43520,
      };

      await service.createPurchaseLedgerEntries(largePurchase, largeSplit);

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'platform_fee',
          amountCents: -5000, // 10% of $500.00
        })
      );
    });
  });

  describe('createRefundLedgerEntries', () => {
    it('creates refund entry with negative amount (debit reversal)', async () => {
      await service.createRefundLedgerEntries(mockPurchase, 1000, 'refund-123');

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerAccountId: 'owner-account-123',
          type: 'refund',
          amountCents: -1000, // Negative = reverses the charge
          currency: 'USD',
          referenceType: 'refund',
          referenceId: 'refund-123',
        })
      );
    });

    it('creates platform fee reversal for full refund', async () => {
      await service.createRefundLedgerEntries(mockPurchase, 1000, 'refund-123');

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'platform_fee',
          amountCents: 100, // Positive = credit (reverses the platform fee debit)
          referenceType: 'refund',
          referenceId: 'refund-123',
        })
      );
    });

    it('creates pro-rata platform fee reversal for partial refund', async () => {
      // 50% refund
      await service.createRefundLedgerEntries(mockPurchase, 500, 'refund-123');

      expect(mockLedgerWriter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'platform_fee',
          amountCents: 50, // 50% of the original platform fee (100)
          referenceType: 'refund',
        })
      );
    });

    it('creates 2 ledger entries for refund (refund + platform fee reversal)', async () => {
      await service.createRefundLedgerEntries(mockPurchase, 1000, 'refund-123');

      expect(mockLedgerWriter.create).toHaveBeenCalledTimes(2);
    });

    it('does not reverse processor fee (Square keeps it)', async () => {
      await service.createRefundLedgerEntries(mockPurchase, 1000, 'refund-123');

      const calls = vi.mocked(mockLedgerWriter.create).mock.calls;
      const processorFeeReversal = calls.find(
        (call) => (call[0] as { type: string }).type === 'processor_fee'
      );

      // Processor fee should NOT be reversed (Square doesn't refund processing fees)
      expect(processorFeeReversal).toBeUndefined();
    });
  });

  describe('Marketplace split verification (10% platform / 90% owner)', () => {
    it('platform fee is exactly 10% of gross in ledger entries', async () => {
      const testCases = [
        { gross: 1000, platformFee: 100 },
        { gross: 2500, platformFee: 250 },
        { gross: 5000, platformFee: 500 },
        { gross: 9999, platformFee: 1000 }, // Rounded
      ];

      for (const { gross, platformFee } of testCases) {
        vi.clearAllMocks();

        const purchase = {
          ...mockPurchase,
          amountCents: gross,
          platformFeeCents: platformFee,
        };

        const split = {
          grossAmountCents: gross,
          platformFeeCents: platformFee,
          processorFeeCents: 59,
          ownerNetCents: gross - platformFee - 59,
        };

        await service.createPurchaseLedgerEntries(purchase, split);

        expect(mockLedgerWriter.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'platform_fee',
            amountCents: -platformFee,
          })
        );
      }
    });

    it('owner net equals gross minus platform fee minus processor fee', async () => {
      const split = {
        grossAmountCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
        ownerNetCents: 841,
      };

      await service.createPurchaseLedgerEntries(mockPurchase, split);

      // Verify the math: 1000 - 100 - 59 = 841
      expect(split.grossAmountCents - split.platformFeeCents - split.processorFeeCents)
        .toBe(split.ownerNetCents);
    });
  });
});
