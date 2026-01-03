/**
 * Subscription Confirmation Token Utilities
 *
 * Generates and validates secure tokens for email confirmation.
 */

import crypto from 'crypto';

const TOKEN_SECRET = process.env.SUBSCRIPTION_TOKEN_SECRET || process.env.JWT_SECRET || 'change-me-in-production';
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a confirmation token for a subscription.
 */
export function generateConfirmationToken(subscriptionId: string, viewerEmail: string): string {
  const payload = `${subscriptionId}:${viewerEmail}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(payload);
  const token = hmac.digest('hex');
  return Buffer.from(`${payload}:${token}`).toString('base64url');
}

/**
 * Validate and extract data from a confirmation token.
 */
export function validateConfirmationToken(token: string): { subscriptionId: string; viewerEmail: string; isValid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [subscriptionId, viewerEmail, timestamp, signature] = decoded.split(':');

    if (!subscriptionId || !viewerEmail || !timestamp || !signature) {
      return { subscriptionId: '', viewerEmail: '', isValid: false };
    }

    // Check expiry (24 hours)
    const tokenAge = Date.now() - Number.parseInt(timestamp, 10);
    const maxAge = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
    if (tokenAge > maxAge) {
      return { subscriptionId: '', viewerEmail: '', isValid: false };
    }

    // Verify signature
    const payload = `${subscriptionId}:${viewerEmail}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return { subscriptionId: '', viewerEmail: '', isValid: false };
    }

    return { subscriptionId, viewerEmail, isValid: true };
  } catch {
    return { subscriptionId: '', viewerEmail: '', isValid: false };
  }
}

