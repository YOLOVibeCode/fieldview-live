/**
 * Square Customer Service
 *
 * Manages Square Customer records and saved payment methods (Card on File).
 * 
 * IMPORTANT: This service does NOT store any payment card data in our database.
 * All payment information is stored securely by Square. We only store:
 * - squareCustomerId: Reference ID to Square's Customer record
 * - Card IDs: References returned from Square API (not stored in DB)
 * 
 * The SavedPaymentMethod interface is for API responses only - data is fetched
 * from Square on-demand and never persisted to our database.
 */

import type { SquareClient } from 'square';

import type { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

/**
 * Saved payment method data (for API responses only, not stored in database).
 * All payment data is stored securely by Square - we only return references.
 */
export interface SavedPaymentMethod {
  id: string; // Square Card ID (reference only, not stored in DB)
  cardBrand: string; // Display only (e.g., "VISA", "MASTERCARD")
  last4: string; // Last 4 digits for display (safe to show)
  expMonth?: number; // Expiry month for display (safe to show)
  expYear?: number; // Expiry year for display (safe to show)
}

export class SquareCustomerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create or retrieve Square Customer for (ownerAccountId, viewerId).
   *
   * IMPORTANT: Customer must be created in the same seller context as payments (owner-scoped Square client).
   */
  async getOrCreateCustomerForOwner(input: {
    ownerAccountId: string;
    viewerId: string;
    email: string;
    phone?: string;
    squareClient: SquareClient;
  }): Promise<string> {
    const existing = await this.prisma.viewerSquareCustomer.findUnique({
      where: {
        ownerAccountId_viewerId: {
          ownerAccountId: input.ownerAccountId,
          viewerId: input.viewerId,
        },
      },
      select: { squareCustomerId: true },
    });
    if (existing?.squareCustomerId) return existing.squareCustomerId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customersApi = (input.squareClient as any).customers;
    const response = await customersApi.createCustomer({
      givenName: input.email.split('@')[0],
      emailAddress: input.email,
      phoneNumber: input.phone || undefined,
    });

    const customerId = response.result.customer?.id as string | undefined;
    if (!customerId) {
      throw new Error('Failed to create Square customer');
    }

    await this.prisma.viewerSquareCustomer.create({
      data: {
        ownerAccountId: input.ownerAccountId,
        viewerId: input.viewerId,
        squareCustomerId: customerId,
      },
    });

    return customerId;
  }

  /**
   * Save payment method (card) to Square Customer
   * Checks for duplicates by last4 and brand to avoid saving the same card twice.
   * Returns null if card already exists (deduplicated).
   */
  async savePaymentMethodForOwner(input: {
    ownerAccountId: string;
    viewerId: string;
    email: string;
    phone?: string;
    sourceId: string;
    squareClient: SquareClient;
  }): Promise<SavedPaymentMethod | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardsApi = (input.squareClient as any).cards;

    try {
      const customerId = await this.getOrCreateCustomerForOwner({
        ownerAccountId: input.ownerAccountId,
        viewerId: input.viewerId,
        email: input.email,
        phone: input.phone,
        squareClient: input.squareClient,
      });

      // List existing cards first to check for duplicates
      const existingCardsResponse = await cardsApi.listCards({
        customerId,
      });
      const existingCards = existingCardsResponse.result.cards || [];

      // Create card from payment source
      const response = await cardsApi.createCard({
        sourceId: input.sourceId,
        card: {
          customerId,
        },
      });

      const newCard = response.result.card;
      if (!newCard) {
        throw new Error('Failed to save payment method');
      }

      const newCardLast4 = newCard.last4 || '';
      const newCardBrand = newCard.cardBrand || 'UNKNOWN';

      // Check if this card already exists (same last4 and brand)
      // This handles the case where Square allows creating the card but we want to deduplicate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const duplicateCard = existingCards.find((card: any) => 
        card.last4 === newCardLast4 && card.cardBrand === newCardBrand
      );

      if (duplicateCard) {
        // Delete the newly created duplicate card
        try {
          await cardsApi.deleteCard(newCard.id);
        } catch (err) {
          // Log but don't fail - the duplicate exists, which is what we want
          logger.warn({ err }, 'Failed to delete duplicate card, but duplicate exists');
        }

        // Return null to indicate card already exists (deduplicated)
        return null;
      }

      // New unique card, return it
      return {
        id: newCard.id,
        cardBrand: newCardBrand,
        last4: newCardLast4,
        expMonth: newCard.expMonth,
        expYear: newCard.expYear,
      };
    } catch (error: any) {
      // If card creation fails, check if it's because card already exists
      if (error?.errors) {
        const errorCode = error.errors[0]?.code;
        const errorMessage = error.errors[0]?.detail || error.message || '';
        
        // Square might return an error for duplicate cards
        if (
          errorCode === 'CARD_ALREADY_EXISTS' ||
          errorCode === 'DUPLICATE_CARD' ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('already exists')
        ) {
          // Card already exists, return null (deduplicated)
          return null;
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * List saved payment methods for a customer
   * Deduplicates cards by last4 and brand to avoid showing the same card multiple times.
   */
  async listSavedPaymentMethodsForOwner(input: {
    ownerAccountId: string;
    viewerId: string;
    squareClient: SquareClient;
  }): Promise<SavedPaymentMethod[]> {
    const mapping = await this.prisma.viewerSquareCustomer.findUnique({
      where: {
        ownerAccountId_viewerId: {
          ownerAccountId: input.ownerAccountId,
          viewerId: input.viewerId,
        },
      },
      select: { squareCustomerId: true },
    });

    if (!mapping?.squareCustomerId) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardsApi = (input.squareClient as any).cards;

    const response = await cardsApi.listCards({
      customerId: mapping.squareCustomerId,
    });

    const cards = response.result.cards || [];
    
    // Deduplicate by last4 and brand - keep the most recent card if duplicates exist
    const cardMap = new Map<string, SavedPaymentMethod>();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const card of cards as any[]) {
      const last4 = card.last4 || '';
      const brand = card.cardBrand || 'UNKNOWN';
      const key = `${brand}-${last4}`;
      
      // If we already have this card, keep the existing one (Square returns them in order)
      // Otherwise, add it
      if (!cardMap.has(key)) {
        cardMap.set(key, {
          id: card.id,
          cardBrand: brand,
          last4,
          expMonth: card.expMonth,
          expYear: card.expYear,
        });
      }
    }
    
    return Array.from(cardMap.values());
  }

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethodForOwner(input: { cardId: string; squareClient: SquareClient }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardsApi = (input.squareClient as any).cards;
    await cardsApi.deleteCard(input.cardId);
  }
}


