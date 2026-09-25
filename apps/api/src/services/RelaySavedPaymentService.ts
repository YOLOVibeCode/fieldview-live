/**
 * Saved payment methods via the relay Connect Hub (card-on-file).
 * Stores only Square customer id mapping in ViewerSquareCustomer.
 */

import type { PrismaClient } from '@prisma/client';

import { logger } from '../lib/logger';

import type { IRelayConnectCustomers, RelaySavedCard } from './IRelayConnectHubService';

export type SavedPaymentMethod = RelaySavedCard;

export class RelaySavedPaymentService {
  constructor(
    private prisma: PrismaClient,
    private relay: IRelayConnectCustomers,
  ) {}

  async getOrCreateCustomerId(input: {
    recipientKey: string;
    ownerAccountId: string;
    viewerId: string;
    email: string;
    phone?: string;
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
    if (existing?.squareCustomerId) {
      return existing.squareCustomerId;
    }

    const customerId = await this.relay.createCustomer(input.recipientKey, {
      email: input.email,
      givenName: input.email.split('@')[0],
      phone: input.phone,
    });

    await this.prisma.viewerSquareCustomer.create({
      data: {
        ownerAccountId: input.ownerAccountId,
        viewerId: input.viewerId,
        squareCustomerId: customerId,
      },
    });

    return customerId;
  }

  async savePaymentMethodForOwner(input: {
    recipientKey: string;
    ownerAccountId: string;
    viewerId: string;
    email: string;
    phone?: string;
    sourceId: string;
  }): Promise<SavedPaymentMethod | null> {
    try {
      const customerId = await this.getOrCreateCustomerId(input);
      return await this.relay.createCard(input.recipientKey, customerId, input.sourceId);
    } catch (err) {
      logger.warn({ err }, 'Relay save payment method failed');
      throw err;
    }
  }

  async listSavedPaymentMethodsForOwner(input: {
    recipientKey: string;
    ownerAccountId: string;
    viewerId: string;
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
    return this.relay.listCards(input.recipientKey, mapping.squareCustomerId);
  }
}
