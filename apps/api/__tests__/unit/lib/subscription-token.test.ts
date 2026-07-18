/**
 * Subscription Token Utilities Unit Tests (TDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { generateConfirmationToken, validateConfirmationToken } from '@/lib/subscription-token';

describe('Subscription Token Utilities', () => {
  beforeEach(() => {
    // Set a consistent secret for testing
    process.env.SUBSCRIPTION_TOKEN_SECRET = 'test-secret-key';
  });

  describe('generateConfirmationToken', () => {
    it('should generate a valid token', () => {
      const token = generateConfirmationToken('sub-123', 'test@example.com');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different inputs', () => {
      const token1 = generateConfirmationToken('sub-123', 'test@example.com');
      const token2 = generateConfirmationToken('sub-456', 'test@example.com');
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same subscription but different email', () => {
      const token1 = generateConfirmationToken('sub-123', 'test1@example.com');
      const token2 = generateConfirmationToken('sub-123', 'test2@example.com');
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateConfirmationToken', () => {
    it('should validate a correctly generated token', () => {
      const subscriptionId = 'sub-123';
      const viewerEmail = 'test@example.com';
      const token = generateConfirmationToken(subscriptionId, viewerEmail);

      const result = validateConfirmationToken(token);
      expect(result.isValid).toBe(true);
      expect(result.subscriptionId).toBe(subscriptionId);
      expect(result.viewerEmail).toBe(viewerEmail);
    });

    it('should reject an invalid token', () => {
      const result = validateConfirmationToken('invalid-token');
      expect(result.isValid).toBe(false);
    });

    it('should reject a tampered token', () => {
      const token = generateConfirmationToken('sub-123', 'test@example.com');
      const tampered = token.slice(0, -5) + 'xxxxx';
      const result = validateConfirmationToken(tampered);
      expect(result.isValid).toBe(false);
    });

    it('should reject an expired token', () => {
      const subscriptionId = 'sub-123';
      const viewerEmail = 'test@example.com';
      
      // Generate token with old timestamp (25 hours ago)
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      const payload = `${subscriptionId}:${viewerEmail}:${oldTimestamp}`;
      const hmac = crypto.createHmac('sha256', 'test-secret-key');
      hmac.update(payload);
      const signature = hmac.digest('hex');
      const expiredToken = Buffer.from(`${payload}:${signature}`).toString('base64url');

      const result = validateConfirmationToken(expiredToken);
      expect(result.isValid).toBe(false);
    });

    it('should accept a token within expiry window', () => {
      const subscriptionId = 'sub-123';
      const viewerEmail = 'test@example.com';
      const token = generateConfirmationToken(subscriptionId, viewerEmail);

      // Token should be valid immediately
      const result = validateConfirmationToken(token);
      expect(result.isValid).toBe(true);
    });
  });
});

