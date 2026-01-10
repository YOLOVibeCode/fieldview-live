/**
 * useDeviceDetection Hook
 * 
 * React hook for detecting device capabilities and orientation.
 * Re-checks on window resize and orientation change.
 */

'use client';

import { useState, useEffect } from 'react';
import { isTouchDevice, isLandscape, getDeviceType } from '@/lib/utils/device-detection';

export function useDeviceDetection() {
  const [isTouch, setIsTouch] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    // Initial detection
    const updateDeviceInfo = () => {
      setIsTouch(isTouchDevice());
      setIsLandscapeMode(isLandscape());
      setDeviceType(getDeviceType());
    };

    updateDeviceInfo();

    // Re-check on resize and orientation change
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return {
    isTouch,
    isLandscape: isLandscapeMode,
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
  };
}

