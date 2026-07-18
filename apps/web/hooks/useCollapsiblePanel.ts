/**
 * useCollapsiblePanel Hook
 * 
 * Shared hook for managing collapsible edge panels (scoreboard left, chat right)
 * Handles state, localStorage persistence, and provides toggle functions
 */

import { useState, useEffect, useCallback } from 'react';

interface UseCollapsiblePanelOptions {
  edge: 'left' | 'right';
  defaultCollapsed: boolean;
  storageKey: string;
}

export function useCollapsiblePanel({
  edge,
  defaultCollapsed,
  storageKey,
}: UseCollapsiblePanelOptions) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, [storageKey]);

  // Toggle function with persistence
  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, String(newState));
      }
      return newState;
    });
  }, [storageKey]);

  // Expand function
  const expand = useCallback(() => {
    setIsCollapsed(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'false');
    }
  }, [storageKey]);

  // Collapse function
  const collapse = useCallback(() => {
    setIsCollapsed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  return {
    isCollapsed,
    toggle,
    expand,
    collapse,
    edge,
  };
}

