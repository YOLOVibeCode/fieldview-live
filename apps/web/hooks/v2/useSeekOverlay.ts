import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSeekOverlayOptions {
  /** How long a press must be held to trigger the overlay (ms). Default: 2000 */
  longPressMs?: number;
  /** How long before the overlay auto-dismisses after no interaction (ms). Default: 5000 */
  autoDismissMs?: number;
}

export interface UseSeekOverlayReturn {
  isVisible: boolean;
  show: () => void;
  dismiss: () => void;
  /** Call this when a button is pressed to reset the auto-dismiss timer */
  resetAutoDismiss: () => void;
  /** Attach these to the long-press detection zone */
  longPressHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
  };
}

export function useSeekOverlay({
  longPressMs = 2000,
  autoDismissMs = 5000,
}: UseSeekOverlayOptions = {}): UseSeekOverlayReturn {
  const [isVisible, setIsVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  const startAutoDismiss = useCallback(() => {
    clearAutoDismiss();
    autoDismissTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, autoDismissMs);
  }, [autoDismissMs, clearAutoDismiss]);

  const show = useCallback(() => {
    setIsVisible(true);
    startAutoDismiss();
  }, [startAutoDismiss]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    clearAutoDismiss();
  }, [clearAutoDismiss]);

  const resetAutoDismiss = useCallback(() => {
    if (isVisible) {
      startAutoDismiss();
    }
  }, [isVisible, startAutoDismiss]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only respond to primary pointer (left click / single touch)
      if (e.button !== 0) return;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        show();
      }, longPressMs);
    },
    [longPressMs, clearLongPress, show]
  );

  const onPointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, []);

  return {
    isVisible,
    show,
    dismiss,
    resetAutoDismiss,
    longPressHandlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave: onPointerUp,
    },
  };
}
