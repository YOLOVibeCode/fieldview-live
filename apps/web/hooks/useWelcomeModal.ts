/**
 * useWelcomeModal Hook
 *
 * Manages the Veo Discovery welcome modal state.
 * Shows on first visit or when ?ref=veo query param present.
 *
 * localStorage key: fv_welcome_modal_shown
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'fv_welcome_modal_shown';
const DONT_SHOW_AGAIN_KEY = 'fv_welcome_modal_dont_show';

export interface UseWelcomeModalResult {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  dontShowAgain: () => void;
  hasSeenModal: boolean;
  isVeoReferral: boolean;
}

/**
 * Hook to manage the welcome modal visibility
 *
 * Shows the modal when:
 * 1. First time visitor (not seen before)
 * 2. ?ref=veo query param present (Veo camera discovery)
 *
 * Does NOT show when:
 * 1. User checked "Don't show again"
 * 2. Already shown in this session (unless ?ref=veo)
 */
export function useWelcomeModal(): UseWelcomeModalResult {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenModal, setHasSeenModal] = useState(true);
  const [isVeoReferral, setIsVeoReferral] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check for ?ref=veo query param (force show)
    const ref = searchParams?.get('ref');
    const isVeo = ref === 'veo';
    setIsVeoReferral(isVeo);

    // Check if user opted out
    const dontShow = localStorage.getItem(DONT_SHOW_AGAIN_KEY) === 'true';
    if (dontShow && !isVeo) {
      setHasSeenModal(true);
      return;
    }

    // Check if already seen (not first visit)
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === 'true';
    setHasSeenModal(alreadySeen);

    // Show modal for first visit or Veo referral
    if (!alreadySeen || isVeo) {
      // Small delay for better UX (let page render first)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);

    // Mark as seen
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
      setHasSeenModal(true);
    }
  }, []);

  const dontShowAgain = useCallback(() => {
    setIsOpen(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(DONT_SHOW_AGAIN_KEY, 'true');
      setHasSeenModal(true);
    }
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    dontShowAgain,
    hasSeenModal,
    isVeoReferral,
  };
}

/**
 * Reset welcome modal state (for testing)
 */
export function resetWelcomeModal(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DONT_SHOW_AGAIN_KEY);
}
