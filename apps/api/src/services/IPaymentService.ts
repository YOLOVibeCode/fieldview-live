/**
 * Payment Service Interfaces (ISP)
 * 
 * Segregated interfaces for payment operations.
 */

import type { Purchase } from '@prisma/client';

export interface CheckoutResponse {
  purchaseId: string;
  checkoutUrl: string;
}

export interface SquareWebhookEvent {
  type: string;
  data: {
    object?: {
      payment?: {
        id?: string;
        status?: string;
        amount_money?: {
          amount?: number;
          currency?: string;
        };
        customer_id?: string;
      };
      refund?: {
        paymentId?: string;
        amountMoney?: {
          amount?: number;
        };
      };
    };
  };
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading payment data.
 */
export interface IPaymentReader {
  getPurchaseById(id: string): Promise<Purchase | null>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing payment operations.
 */
export interface IPaymentWriter {
  createCheckout(gameId: string, viewerEmail: string, viewerPhone?: string, returnUrl?: string): Promise<CheckoutResponse>;
  createChannelCheckout(channelId: string, viewerEmail: string, viewerPhone?: string, returnUrl?: string): Promise<CheckoutResponse>;
  /**
   * Create DirectStream paywall checkout session.
   * @param directStreamSlug - The slug of the DirectStream (e.g., 'tchs')
   * @param viewerEmail - Viewer's email address
   * @param viewerFirstName - Viewer's first name
   * @param viewerLastName - Viewer's last name
   * @param viewerPhone - Optional phone number
   * @param returnUrl - Optional return URL after payment
   * @returns CheckoutResponse with purchaseId and checkoutUrl
   */
  createDirectStreamCheckout(
    directStreamSlug: string,
    viewerEmail: string,
    viewerFirstName: string,
    viewerLastName: string,
    viewerPhone?: string,
    returnUrl?: string
  ): Promise<CheckoutResponse>;
  processSquareWebhook(event: SquareWebhookEvent): Promise<void>;
}
