/**
 * Unit tests for viewer JWT utilities (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateViewerToken, verifyViewerToken, formatDisplayName } from '@/lib/viewer-jwt';

describe('Viewer JWT', () => {
  const mockData = {
    viewerId: 'viewer-123',
    gameId: 'game-456',
    slug: 'tchs',
    displayName: 'John D.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateViewerToken', () => {
    it('generates a valid JWT token with correct claims', () => {
      const token = generateViewerToken(mockData);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('includes all required claims in token', () => {
      const token = generateViewerToken(mockData);
      const verified = verifyViewerToken(token);
      
      expect(verified.viewerId).toBe(mockData.viewerId);
      expect(verified.gameId).toBe(mockData.gameId);
      expect(verified.slug).toBe(mockData.slug);
      expect(verified.displayName).toBe(mockData.displayName);
      expect(verified.exp).toBeDefined();
      expect(verified.iat).toBeDefined();
    });

    it('sets expiration to 24 hours by default', () => {
      const token = generateViewerToken(mockData);
      const verified = verifyViewerToken(token);
      
      const expectedExp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(verified.exp).toBeLessThanOrEqual(expectedExp + 5); // Allow 5s skew
    });
  });

  describe('verifyViewerToken', () => {
    it('verifies and decodes a valid token', () => {
      const token = generateViewerToken(mockData);
      const result = verifyViewerToken(token);
      
      expect(result).toBeTruthy();
      expect(result.viewerId).toBe(mockData.viewerId);
    });

    it('throws error for invalid token signature', () => {
      const token = generateViewerToken(mockData);
      const invalidToken = token + 'tampered';
      
      expect(() => verifyViewerToken(invalidToken)).toThrow();
    });

    it('throws error for expired token', () => {
      // Mock token with past expiration
      const expiredData = { ...mockData, expiresIn: -1 };
      const token = generateViewerToken(expiredData);
      
      // Fast-forward time
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000); // 25 hours later
      
      expect(() => verifyViewerToken(token)).toThrow();
      
      vi.useRealTimers();
    });

    it('throws error for malformed token', () => {
      expect(() => verifyViewerToken('not.a.token')).toThrow();
      expect(() => verifyViewerToken('')).toThrow();
    });
  });

  describe('formatDisplayName', () => {
    it('formats name as "First L." for privacy', () => {
      expect(formatDisplayName('John', 'Doe')).toBe('John D.');
      expect(formatDisplayName('Sarah', 'Smith')).toBe('Sarah S.');
    });

    it('handles single name without last initial', () => {
      expect(formatDisplayName('John', '')).toBe('John');
      expect(formatDisplayName('Sarah', ' ')).toBe('Sarah');
    });

    it('handles empty names gracefully', () => {
      expect(formatDisplayName('', '')).toBe('Anonymous');
      expect(formatDisplayName(' ', ' ')).toBe('Anonymous');
    });

    it('trims whitespace', () => {
      expect(formatDisplayName(' John ', ' Doe ')).toBe('John D.');
    });

    it('uppercases last initial', () => {
      expect(formatDisplayName('John', 'doe')).toBe('John D.');
    });
  });
});

