/**
 * Test Utilities for v2 Components
 * 
 * Provides helper functions for testing responsive behavior
 * and v2 components
 */

/**
 * Mock window dimensions for testing responsive behavior
 * 
 * @param width - Window width in pixels
 * @param height - Window height in pixels
 */
export function mockWindowSize(width: number, height: number) {
  // Mock window.innerWidth and innerHeight
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Mock touch support for testing
 * 
 * @param hasTouch - Whether device should report touch support
 */
export function mockTouchSupport(hasTouch: boolean) {
  if (hasTouch) {
    // Add touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: () => {},
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 1,
    });
  } else {
    // Remove touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  }
}

/**
 * Mock orientation for testing
 * 
 * @param orientation - 'portrait' or 'landscape'
 */
export function mockOrientation(orientation: 'portrait' | 'landscape') {
  if (orientation === 'portrait') {
    mockWindowSize(375, 667);  // iPhone portrait
  } else {
    mockWindowSize(667, 375);  // iPhone landscape
  }
}

/**
 * Preset viewport sizes for common devices
 */
export const VIEWPORTS = {
  // Mobile
  iPhoneSE: { width: 375, height: 667, name: 'iPhone SE' },
  iPhone13: { width: 390, height: 844, name: 'iPhone 13' },
  iPhone13Pro: { width: 390, height: 844, name: 'iPhone 13 Pro' },
  
  // Tablet
  iPadMini: { width: 768, height: 1024, name: 'iPad Mini' },
  iPadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
  
  // Desktop
  laptop: { width: 1280, height: 800, name: 'Laptop' },
  desktop1080p: { width: 1920, height: 1080, name: 'Desktop 1080p' },
  desktop4K: { width: 3840, height: 2160, name: 'Desktop 4K' },
} as const;

/**
 * Set viewport to a preset device
 * 
 * @param device - Device name from VIEWPORTS
 */
export function setViewport(device: keyof typeof VIEWPORTS) {
  const { width, height } = VIEWPORTS[device];
  mockWindowSize(width, height);
}

/**
 * Wait for next animation frame
 * Useful for testing animations and transitions
 */
export function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Wait for multiple animation frames
 * 
 * @param frames - Number of frames to wait
 */
export async function waitForAnimationFrames(frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await waitForAnimationFrame();
  }
}

/**
 * Mock matchMedia for testing media queries
 * 
 * @param query - Media query string
 * @param matches - Whether the query should match
 */
export function mockMatchMedia(query: string, matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (q: string) => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

/**
 * Get computed style value
 * Helper for checking CSS variables
 * 
 * @param element - HTML element
 * @param property - CSS property name
 */
export function getComputedStyleValue(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property).trim();
}

/**
 * Check if element is visible in viewport
 * 
 * @param element - HTML element
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Trigger swipe gesture on element
 * 
 * @param element - HTML element
 * @param direction - 'up' | 'down' | 'left' | 'right'
 * @param distance - Swipe distance in pixels
 */
export function triggerSwipe(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 100
) {
  const rect = element.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  switch (direction) {
    case 'up':
      endY -= distance;
      break;
    case 'down':
      endY += distance;
      break;
    case 'left':
      endX -= distance;
      break;
    case 'right':
      endX += distance;
      break;
  }
  
  // Trigger touchstart
  element.dispatchEvent(new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [{
      clientX: startX,
      clientY: startY,
    } as Touch],
  }));
  
  // Trigger touchmove
  element.dispatchEvent(new TouchEvent('touchmove', {
    bubbles: true,
    cancelable: true,
    touches: [{
      clientX: endX,
      clientY: endY,
    } as Touch],
  }));
  
  // Trigger touchend
  element.dispatchEvent(new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
  }));
}

