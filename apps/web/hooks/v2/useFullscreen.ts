/**
 * useFullscreen Hook
 * 
 * React hook for managing fullscreen state with the Fullscreen API
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  isSupported: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

/**
 * Hook to manage fullscreen state for a specific element
 * 
 * @param elementRef - The HTML element to make fullscreen (null during SSR)
 * @returns Fullscreen state and control functions
 * 
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(videoRef.current);
 * 
 * return (
 *   <div>
 *     <video ref={videoRef} />
 *     {isSupported && (
 *       <button onClick={toggleFullscreen}>
 *         {isFullscreen ? 'Exit' : 'Enter'} Fullscreen
 *       </button>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useFullscreen(element: HTMLElement | null): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check if Fullscreen API is supported
  useEffect(() => {
    const supported = !!(
      document.fullscreenEnabled ||
      // @ts-ignore - vendor prefixes
      document.webkitFullscreenEnabled ||
      // @ts-ignore
      document.mozFullScreenEnabled ||
      // @ts-ignore
      document.msFullscreenEnabled
    );
    
    setIsSupported(supported);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        // @ts-ignore - vendor prefixes
        document.webkitFullscreenElement ||
        // @ts-ignore
        document.mozFullScreenElement ||
        // @ts-ignore
        document.msFullscreenElement;
      
      setIsFullscreen(fullscreenElement === element);
    };

    // Add listeners for all vendor-prefixed events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [element]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!element || !isSupported) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, [element, isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) return;

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, [isSupported]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

