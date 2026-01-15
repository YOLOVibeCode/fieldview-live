/**
 * usePaywall Hook
 * 
 * Manages paywall state, payment status, and demo bypass logic.
 * Follows ISP (Interface Segregation Principle) with separate interfaces.
 * 
 * Usage:
 * ```tsx
 * const paywall = usePaywall({ 
 *   slug: 'tchs', 
 *   enabled: true,
 *   demoMode: false 
 * });
 * 
 * if (paywall.isBlocked) {
 *   return (
 *     <PaywallModal
 *       isOpen={paywall.showPaywall}
 *       onClose={paywall.closePaywall}
 *       priceInCents={paywall.priceInCents}
 *       onSuccess={() => paywall.markAsPaid(purchaseId)}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

// ISP: State interface
export interface IPaywallState {
  isBlocked: boolean;           // Is content blocked by paywall?
  hasPaid: boolean;             // Has user paid for access?
  isBypassed: boolean;          // Is bypass active (demo only)?
  showPaywall: boolean;         // Should show paywall modal?
  isLoading: boolean;           // Is loading config?
  error: string | null;         // Error message if any
}

// ISP: Actions interface
export interface IPaywallActions {
  openPaywall: () => void;
  closePaywall: () => void;
  bypassPaywall: (code: string) => boolean;
  markAsPaid: (purchaseId: string) => void;
}

// ISP: Config interface
export interface IPaywallConfig {
  priceInCents: number;
  customMessage?: string | null;
  allowSavePayment?: boolean;
}

// Hook options
export interface UsePaywallOptions {
  slug: string;
  enabled?: boolean;            // Fetch config from API
  demoMode?: boolean;           // Enable demo bypass
  bypassCode?: string;          // Secret bypass code (env-based)
}

// Combined return type
export type UsePaywallReturn = IPaywallState & IPaywallActions & IPaywallConfig;

interface PaywallStorageData {
  hasPaid: boolean;
  purchaseId?: string;
  timestamp?: number;
}

interface PaywallConfigResponse {
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage?: string | null;
  allowSavePayment?: boolean;
}

/**
 * Hook to manage paywall state and actions
 */
export function usePaywall({
  slug,
  enabled = false,
  demoMode = false,
  bypassCode,
}: UsePaywallOptions): UsePaywallReturn {
  // State
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Config
  const [priceInCents, setPriceInCents] = useState(0);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [allowSavePayment, setAllowSavePayment] = useState(false);
  const [paywallEnabled, setPaywallEnabled] = useState(false);

  // Storage keys
  const storageKey = `paywall_${slug}`;
  const bypassStorageKey = 'paywall_demo_bypass';

  /**
   * Load payment status from localStorage
   */
  const loadPaymentStatus = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: PaywallStorageData = JSON.parse(stored);
        setHasPaid(data.hasPaid);
      }
    } catch (err) {
      console.error('[usePaywall] Failed to load payment status:', err);
    }
  }, [storageKey]);

  /**
   * Load bypass status from localStorage (demo mode only)
   */
  const loadBypassStatus = useCallback(() => {
    if (typeof window === 'undefined' || !demoMode) return;

    try {
      const bypassed = localStorage.getItem(bypassStorageKey) === 'true';
      setIsBypassed(bypassed);
    } catch (err) {
      console.error('[usePaywall] Failed to load bypass status:', err);
    }
  }, [bypassStorageKey, demoMode]);

  /**
   * Fetch paywall configuration from API
   */
  const fetchConfig = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/public/direct/${slug}/bootstrap`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch paywall config: ${response.statusText}`);
      }

      const data: PaywallConfigResponse = await response.json();
      
      setPaywallEnabled(data.paywallEnabled || false);
      setPriceInCents(data.priceInCents || 0);
      setCustomMessage(data.paywallMessage || null);
      setAllowSavePayment(data.allowSavePayment || false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[usePaywall] Fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [slug, enabled]);

  /**
   * Calculate if content should be blocked
   */
  const calculateBlocked = useCallback(() => {
    // Not blocked if:
    // 1. Paywall is disabled
    // 2. User has paid
    // 3. Bypass is active (demo mode)
    const shouldBlock = paywallEnabled && !hasPaid && !isBypassed;
    setIsBlocked(shouldBlock);
  }, [paywallEnabled, hasPaid, isBypassed]);

  /**
   * Open paywall modal
   */
  const openPaywall = useCallback(() => {
    setShowPaywall(true);
  }, []);

  /**
   * Close paywall modal
   */
  const closePaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  /**
   * Attempt to bypass paywall with secret code (demo mode only)
   */
  const bypassPaywall = useCallback((code: string): boolean => {
    // Only allow bypass in demo mode
    if (!demoMode) {
      console.warn('[usePaywall] Bypass attempted in non-demo mode');
      return false;
    }

    // Validate code
    if (!bypassCode || code !== bypassCode) {
      console.warn('[usePaywall] Invalid bypass code');
      return false;
    }

    // Set bypass
    setIsBypassed(true);
    setIsBlocked(false);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(bypassStorageKey, 'true');
    }

    console.log('[usePaywall] Bypass activated');
    return true;
  }, [demoMode, bypassCode, bypassStorageKey]);

  /**
   * Mark as paid and persist to localStorage
   */
  const markAsPaid = useCallback((purchaseId: string) => {
    setHasPaid(true);
    setIsBlocked(false);
    setShowPaywall(false);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      const data: PaywallStorageData = {
        hasPaid: true,
        purchaseId,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    }

    console.log('[usePaywall] Marked as paid:', purchaseId);
  }, [storageKey]);

  /**
   * Initialize: Load from localStorage
   */
  useEffect(() => {
    loadPaymentStatus();
    loadBypassStatus();
  }, [loadPaymentStatus, loadBypassStatus]);

  /**
   * Fetch configuration when enabled
   */
  useEffect(() => {
    if (enabled) {
      fetchConfig();
    }
  }, [enabled, fetchConfig]);

  /**
   * Recalculate blocked state when dependencies change
   */
  useEffect(() => {
    calculateBlocked();
  }, [calculateBlocked]);

  // Return ISP-compliant interfaces
  return {
    // State
    isBlocked,
    hasPaid,
    isBypassed,
    showPaywall,
    isLoading,
    error,
    
    // Actions
    openPaywall,
    closePaywall,
    bypassPaywall,
    markAsPaid,
    
    // Config
    priceInCents,
    customMessage,
    allowSavePayment,
  };
}

