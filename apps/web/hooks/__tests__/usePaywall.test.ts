/**
 * usePaywall Hook Tests
 * 
 * TDD: Tests written FIRST before implementation
 * ISP: Tests verify interface segregation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaywall } from '../usePaywall';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('usePaywall', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      expect(result.current.isBlocked).toBe(false);
      expect(result.current.hasPaid).toBe(false);
      expect(result.current.isBypassed).toBe(false);
      expect(result.current.showPaywall).toBe(false);
      expect(result.current.priceInCents).toBe(0);
    });

    it('should load state from localStorage if exists', () => {
      localStorage.setItem('paywall_test-stream', JSON.stringify({
        hasPaid: true,
        purchaseId: 'test-purchase-123',
      }));

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      expect(result.current.hasPaid).toBe(true);
    });

    it('should fetch paywall config when enabled', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paywallEnabled: true,
          priceInCents: 499,
          paywallMessage: 'Test message',
        }),
      });

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.priceInCents).toBe(499);
      });
    });
  });

  describe('Paywall State Logic', () => {
    it('should block content when paywall enabled and not paid', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paywallEnabled: true,
          priceInCents: 499,
        }),
      });

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.isBlocked).toBe(true);
      });
    });

    it('should NOT block when paywall disabled', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paywallEnabled: false,
          priceInCents: 0,
        }),
      });

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.isBlocked).toBe(false);
      });
    });

    it('should NOT block when user has paid', async () => {
      localStorage.setItem('paywall_test-stream', JSON.stringify({
        hasPaid: true,
        purchaseId: 'test-purchase-123',
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paywallEnabled: true,
          priceInCents: 499,
        }),
      });

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.isBlocked).toBe(false);
        expect(result.current.hasPaid).toBe(true);
      });
    });

    it('should NOT block when bypassed', async () => {
      localStorage.setItem('paywall_demo_bypass', 'true');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paywallEnabled: true,
          priceInCents: 499,
        }),
      });

      const { result } = renderHook(() => 
        usePaywall({ slug: 'demo-stream', enabled: true, demoMode: true })
      );

      await waitFor(() => {
        expect(result.current.isBlocked).toBe(false);
        expect(result.current.isBypassed).toBe(true);
      });
    });
  });

  describe('Actions', () => {
    it('should open paywall modal', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      act(() => {
        result.current.openPaywall();
      });

      expect(result.current.showPaywall).toBe(true);
    });

    it('should close paywall modal', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      act(() => {
        result.current.openPaywall();
        result.current.closePaywall();
      });

      expect(result.current.showPaywall).toBe(false);
    });

    it('should mark as paid and persist to localStorage', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      act(() => {
        result.current.markAsPaid('purchase-123');
      });

      expect(result.current.hasPaid).toBe(true);
      
      const stored = JSON.parse(localStorage.getItem('paywall_test-stream') || '{}');
      expect(stored.hasPaid).toBe(true);
      expect(stored.purchaseId).toBe('purchase-123');
    });
  });

  describe('Demo Bypass', () => {
    it('should allow bypass with correct code in demo mode', () => {
      const { result } = renderHook(() => 
        usePaywall({ 
          slug: 'demo-stream', 
          enabled: false,
          demoMode: true,
          bypassCode: 'FIELDVIEW2026',
        })
      );

      let bypassResult = false;
      act(() => {
        bypassResult = result.current.bypassPaywall('FIELDVIEW2026');
      });

      expect(bypassResult).toBe(true);
      expect(result.current.isBypassed).toBe(true);
      expect(localStorage.getItem('paywall_demo_bypass')).toBe('true');
    });

    it('should reject bypass with incorrect code', () => {
      const { result } = renderHook(() => 
        usePaywall({ 
          slug: 'demo-stream', 
          enabled: false,
          demoMode: true,
          bypassCode: 'FIELDVIEW2026',
        })
      );

      let bypassResult = true;
      act(() => {
        bypassResult = result.current.bypassPaywall('WRONG_CODE');
      });

      expect(bypassResult).toBe(false);
      expect(result.current.isBypassed).toBe(false);
    });

    it('should NOT allow bypass when NOT in demo mode', () => {
      const { result } = renderHook(() => 
        usePaywall({ 
          slug: 'production-stream', 
          enabled: false,
          demoMode: false, // Production
          bypassCode: 'FIELDVIEW2026',
        })
      );

      let bypassResult = true;
      act(() => {
        bypassResult = result.current.bypassPaywall('FIELDVIEW2026');
      });

      expect(bypassResult).toBe(false);
      expect(result.current.isBypassed).toBe(false);
    });

    it('should load bypassed state from localStorage on mount', () => {
      localStorage.setItem('paywall_demo_bypass', 'true');

      const { result } = renderHook(() => 
        usePaywall({ 
          slug: 'demo-stream', 
          enabled: false,
          demoMode: true,
        })
      );

      expect(result.current.isBypassed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle invalid JSON responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: true }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('ISP Compliance', () => {
    it('should provide state interface', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      // IPaywallState
      expect(typeof result.current.isBlocked).toBe('boolean');
      expect(typeof result.current.hasPaid).toBe('boolean');
      expect(typeof result.current.isBypassed).toBe('boolean');
      expect(typeof result.current.showPaywall).toBe('boolean');
    });

    it('should provide actions interface', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      // IPaywallActions
      expect(typeof result.current.openPaywall).toBe('function');
      expect(typeof result.current.closePaywall).toBe('function');
      expect(typeof result.current.bypassPaywall).toBe('function');
      expect(typeof result.current.markAsPaid).toBe('function');
    });

    it('should provide config interface', () => {
      const { result } = renderHook(() => usePaywall({ slug: 'test-stream', enabled: false }));

      // IPaywallConfig
      expect(typeof result.current.priceInCents).toBe('number');
      expect(result.current.customMessage === undefined || typeof result.current.customMessage === 'string').toBe(true);
    });
  });
});

