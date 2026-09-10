/**
 * Device Detection Utilities
 * 
 * Mobile-first helpers for detecting device capabilities.
 */

/**
 * Detects if the current device is a touch device.
 * Uses multiple detection methods for reliability.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - For older browsers
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Classifies the device as mobile, tablet, or desktop based on viewport width.
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Detects if the device is mobile-sized (portrait phone or small tablet).
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/** Classifies viewport width into mobile, tablet, or desktop. */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Detects if the device is in landscape orientation.
 */
export function isLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
}

/**
 * Detects if the device supports Picture-in-Picture.
 */
export function supportsPiP(): boolean {
  if (typeof document === 'undefined') return false;
  return 'pictureInPictureEnabled' in document;
}

/**
 * Gets the user's thumb zone reach.
 * Returns 'easy', 'medium', or 'hard' based on vertical position.
 */
export function getThumbZone(yPosition: number, screenHeight: number): 'easy' | 'medium' | 'hard' {
  const relativePosition = yPosition / screenHeight;
  
  if (relativePosition > 0.7) return 'easy'; // Bottom 30%
  if (relativePosition > 0.3) return 'medium'; // Middle 40%
  return 'hard'; // Top 30%
}
